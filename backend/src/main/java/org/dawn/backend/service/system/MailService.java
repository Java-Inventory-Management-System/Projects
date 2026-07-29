package org.dawn.backend.service.system;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.mail.javamail.MimeMessagePreparator;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class MailService {
    private final JavaMailSender mailSender;

    private final TemplateEngine templateEngine;

    @Value("${spring.mail.enabled}")
    private Boolean enabled;

    @Value("${spring.mail.from}")
    private String mailFrom;

    public void sendHtmlMail(String to, String subject, String templateName, Map<String, Object> variables) {
        if (!enabled) {
            log.info("[DEV] pass out sending mail. Send to: {} | Title: {} | Data: {}", to, subject, variables);
            return;
        }
        Context context = new Context();
        context.setVariables(variables);
        String htmlContent = templateEngine.process(templateName, context);

        MimeMessagePreparator preparator = mimeMessage -> {
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
            helper.setTo(to);
            helper.setFrom(mailFrom);
            helper.setSubject(subject);
            helper.setText(htmlContent, true);
        };

        Thread.ofVirtual().start(() -> {
            try {
                mailSender.send(preparator);
                log.info("Email sent successfully to: {}", to);
            } catch (Exception e) {
                log.error("Failed to send email to: {}", to, e);
            }
        });
    }

    public void sendPasswordResetMail(String to, String recipientName, String resetLink) {
        Map<String, Object> variables = new HashMap<>();
        variables.put("name", recipientName);
        variables.put("resetLink", resetLink);
        sendHtmlMail(to, "Đặt lại mật khẩu", "password-reset", variables);
    }

}
