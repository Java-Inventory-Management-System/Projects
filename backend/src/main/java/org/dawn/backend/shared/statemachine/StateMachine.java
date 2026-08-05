package org.dawn.backend.shared.statemachine;
import org.dawn.backend.constant.shared.ErrorCode;

import org.dawn.backend.exception.type.InvalidRequestException;

import java.util.Arrays;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

public class StateMachine<S extends Enum<S>> {
    private final Map<S, Set<S>> transitions;

    public StateMachine(Class<S> type) {
        this.transitions = new EnumMap<>(type);
    }

    public StateMachine<S> allow(S from, S... to) {
        transitions.put(from, EnumSet.copyOf(Arrays.asList(to)));
        return this;
    }

    public void validate(S from, S to) {
        var allowed = transitions.getOrDefault(from, Set.of());
        if (!allowed.contains(to))
            throw new InvalidRequestException(ErrorCode.INVALID_STATE_TRANSITION.format( from, to));
    }
}
