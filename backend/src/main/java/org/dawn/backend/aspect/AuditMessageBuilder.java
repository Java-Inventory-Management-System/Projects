package org.dawn.backend.aspect;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import org.dawn.backend.constant.shared.LogConstant;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Component
@RequiredArgsConstructor
public class AuditMessageBuilder {

    private static final List<String> SENSITIVE_SUBSTRINGS = List.of("password", "token", "secret");
    private static final Set<String> ACRONYMS = Set.of("SKU", "IP", "ID", "URL");
    private static final int MAX_DIFF_FIELDS = 3;
    private static final int MAX_VALUE_LENGTH = 30;

    private static final Map<String, String> PAST_VERBS = Map.ofEntries(
            Map.entry("CREATE_", "created"),
            Map.entry("UPDATE_", "updated"),
            Map.entry("APPROVE_", "approved"),
            Map.entry("REJECT_", "rejected"),
            Map.entry("CANCEL_", "cancelled"),
            Map.entry("TOGGLE_", "toggled"),
            Map.entry("DELETE_", "deleted"),
            Map.entry("EDIT_", "edited"),
            Map.entry("SEAL_", "sealed"),
            Map.entry("UNSEAL_", "unsealed"),
            Map.entry("MOVE_", "moved"),
            Map.entry("START_", "started"),
            Map.entry("COMPLETE_", "completed"),
            Map.entry("FULFILL_", "fulfilled"),
            Map.entry("RECORD_", "recorded"),
            Map.entry("CONFIRM_", "confirmed"),
            Map.entry("RELOCATE_", "relocated"),
            Map.entry("QC_PASS", "passed QC"),
            Map.entry("DISPOSE_CONFIRM", "confirmed disposal"),
            Map.entry("RESET_", "reset"),
            Map.entry("CHANGE_", "changed"));

    private static final Map<String, String> BASE_VERBS = Map.ofEntries(
            Map.entry("CREATE_", "create"),
            Map.entry("UPDATE_", "update"),
            Map.entry("APPROVE_", "approve"),
            Map.entry("REJECT_", "reject"),
            Map.entry("CANCEL_", "cancel"),
            Map.entry("TOGGLE_", "toggle"),
            Map.entry("DELETE_", "delete"),
            Map.entry("EDIT_", "edit"),
            Map.entry("SEAL_", "seal"),
            Map.entry("UNSEAL_", "unseal"),
            Map.entry("MOVE_", "move"),
            Map.entry("START_", "start"),
            Map.entry("COMPLETE_", "complete"),
            Map.entry("FULFILL_", "fulfill"),
            Map.entry("RECORD_", "record"),
            Map.entry("CONFIRM_", "confirm"),
            Map.entry("RELOCATE_", "relocate"),
            Map.entry("QC_PASS", "pass QC"),
            Map.entry("DISPOSE_CONFIRM", "confirm disposal"),
            Map.entry("RESET_", "reset"),
            Map.entry("CHANGE_", "change"));

    private final ObjectMapper objectMapper;

    public record MessageResult(String message, List<String> messageFields) {}

    public MessageResult build(String username, String action, String entity,
                               String entityId, String oldValue, String newValue,
                               String status, String errorMsg) {
        if (LogConstant.Action.LOGIN_FAILED.equals(action)) {
            return new MessageResult(errorMsg != null ? "login failed: " + errorMsg : "login failed", List.of());
        }
        if (LogConstant.Action.LOGIN_SUCCESS.equals(action)) {
            return new MessageResult((username != null ? username : "SYSTEM") + " logged in", List.of());
        }
        if (LogConstant.Action.LOGOUT.equals(action)) {
            return new MessageResult((username != null ? username : "SYSTEM") + " logged out", List.of());
        }

        String entityLabel = humanizeEntity(entity);
        String code = extractCode(oldValue, newValue, entityId);
        String codePart = code != null ? " " + code : "";

        if (LogConstant.Status.FAILED.equals(status)) {
            String base = matchVerb(BASE_VERBS, action, action.toLowerCase().replace('_', ' '));
            StringBuilder sb = new StringBuilder(base);
            if (entityLabel != null) sb.append(" ").append(entityLabel);
            sb.append(codePart);
            sb.append(errorMsg != null ? " failed: " + errorMsg : " failed");
            return new MessageResult(sb.toString(), List.of());
        }

        String verb = matchVerb(PAST_VERBS, action, action.toLowerCase().replace('_', ' '));
        StringBuilder sb = new StringBuilder();
        if (username != null && !username.isBlank()) sb.append(username).append(" ");
        sb.append(verb);
        if (entityLabel != null) sb.append(" ").append(entityLabel);
        sb.append(codePart);
        DiffParts diff = buildDiffParts(oldValue, newValue);
        if (!diff.text().isEmpty()) sb.append(" ").append(diff.text());
        return new MessageResult(sb.toString(), diff.fieldNames());
    }

    public String sanitize(String json) {
        if (json == null) return null;
        try {
            JsonNode node = objectMapper.readTree(json);
            removeSensitive(node);
            return objectMapper.writeValueAsString(node);
        } catch (JsonProcessingException e) {
            return json;
        }
    }

    public static boolean isSensitiveField(String field) {
        String lower = field.toLowerCase();
        return SENSITIVE_SUBSTRINGS.stream().anyMatch(lower::contains);
    }

    private record DiffParts(String text, List<String> fieldNames) {}

    private DiffParts buildDiffParts(String oldValue, String newValue) {
        if (oldValue == null || newValue == null) return new DiffParts("", List.of());
        try {
            JsonNode oldNode = objectMapper.readTree(oldValue);
            JsonNode newNode = objectMapper.readTree(newValue);
            if (!oldNode.isObject() || !newNode.isObject()) return new DiffParts("", List.of());
            List<String> parts = new ArrayList<>();
            List<String> fields = new ArrayList<>();
            addChanged(parts, fields, oldNode, newNode, "status");
            for (Iterator<String> it = newNode.fieldNames(); it.hasNext() && parts.size() < MAX_DIFF_FIELDS; ) {
                String field = it.next();
                if (!"status".equals(field) && !isSensitiveField(field) && !field.toLowerCase().endsWith("at")) {
                    addChanged(parts, fields, oldNode, newNode, field);
                }
            }
            return parts.isEmpty() ? new DiffParts("", List.of())
                    : new DiffParts("(" + String.join(", ", parts) + ")", fields);
        } catch (JsonProcessingException e) {
            return new DiffParts("", List.of());
        }
    }

    private void addChanged(List<String> parts, List<String> fields, JsonNode oldNode, JsonNode newNode, String field) {
        if (parts.size() >= MAX_DIFF_FIELDS) return;
        JsonNode o = oldNode.get(field);
        JsonNode n = newNode.get(field);
        if (o == null || n == null || o.isNull() || n.isNull()) return;
        if (o.isObject() && n.isObject() && (o.isEmpty() || n.isEmpty())) return;
        String ov = prettyValue(o);
        String nv = prettyValue(n);
        if (!ov.equals(nv)) {
            parts.add(humanizeFieldName(field) + ": " + ov + " \u2192 " + nv);
            fields.add(field);
        }
    }

    static String humanizeFieldName(String field) {
        String[] words = field.replaceAll("([a-z])([A-Z])", "$1 $2").split(" ");
        StringBuilder sb = new StringBuilder();
        for (String w : words) {
            if (w.isEmpty()) continue;
            String upper = w.toUpperCase();
            if ("IDS".equals(upper)) sb.append("IDs");
            else if (ACRONYMS.contains(upper)) sb.append(upper);
            else sb.append(Character.toUpperCase(w.charAt(0))).append(w.substring(1).toLowerCase());
            sb.append(' ');
        }
        return sb.toString().trim();
    }

    private String prettyValue(JsonNode node) {
        String raw = node.isBigDecimal() ? node.decimalValue().toPlainString()
                : node.isDouble() ? BigDecimal.valueOf(node.doubleValue()).toPlainString()
                : node.isTextual() ? node.asText() : node.toString();
        return raw.length() > MAX_VALUE_LENGTH ? raw.substring(0, MAX_VALUE_LENGTH) + "..." : raw;
    }

    private String extractCode(String oldValue, String newValue, String entityId) {
        String code = extractCodeFromJson(newValue);
        if (code == null) code = extractCodeFromJson(oldValue);
        if (code != null) return code;
        return entityId != null && !entityId.isBlank() ? "#" + entityId : null;
    }

    private String extractCodeFromJson(String json) {
        if (json == null) return null;
        try {
            JsonNode node = objectMapper.readTree(json);
            if (!node.isObject()) return null;
            for (Iterator<String> it = node.fieldNames(); it.hasNext(); ) {
                String field = it.next();
                if (field.toLowerCase().endsWith("code")) {
                    JsonNode value = node.get(field);
                    if (value != null && value.isTextual() && !value.asText().isBlank()) return value.asText();
                }
            }
            return null;
        } catch (JsonProcessingException e) {
            return null;
        }
    }

    private String humanizeEntity(String entity) {
        if (entity == null || entity.isBlank()) return null;
        return entity.toLowerCase().replace('_', ' ');
    }

    private String matchVerb(Map<String, String> verbs, String action, String fallback) {
        for (Map.Entry<String, String> entry : verbs.entrySet()) {
            if (action.startsWith(entry.getKey())) return entry.getValue();
        }
        return fallback;
    }

    private void removeSensitive(JsonNode node) {
        if (node instanceof ObjectNode obj) {
            List<String> toRemove = new ArrayList<>();
            for (Iterator<Map.Entry<String, JsonNode>> it = obj.fields(); it.hasNext(); ) {
                Map.Entry<String, JsonNode> e = it.next();
                if (isSensitiveField(e.getKey())) {
                    toRemove.add(e.getKey());
                } else {
                    removeSensitive(e.getValue());
                }
            }
            toRemove.forEach(obj::remove);
        } else if (node.isArray()) {
            node.forEach(this::removeSensitive);
        }
    }
}
