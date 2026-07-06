package org.dawn.backend.constant.shared;

public class LogConstant {
    public static class Action {
        public static final String CREATE_USER = "CREATE_USER";
        public static final String UPDATE_INFO = "UPDATE_USER_INFO";
        public static final String UPDATE_STATUS = "UPDATE_USER_STATUS";
        public static final String UPDATE_ROLE = "UPDATE_USER_ROLE";
        public static final String CHANGE_PASSWORD = "CHANGE_PASSWORD";
        public static final String RESET_PASSWORD = "RESET_PASSWORD";
    }

    public static class Entity {
        public static final String USER = "USER";
    }

    public static class Status {
        public static final String SUCCESS = "SUCCESS";
        public static final String FAILED = "FAILED";
    }
}
