package com.hotclick.dto;

import java.time.LocalDateTime;

public class ResponseDTO {

    private boolean success;
    private String message;
    private Object data;
    private String timestamp;

    public ResponseDTO() {}

    public ResponseDTO(boolean success, String message, Object data, String timestamp) {
        this.success = success;
        this.message = message;
        this.data = data;
        this.timestamp = timestamp;
    }

    public static ResponseDTO success(String message, Object data) {
        return new ResponseDTO(true, message, data, LocalDateTime.now().toString());
    }

    public static ResponseDTO error(String message) {
        return new ResponseDTO(false, message, null, LocalDateTime.now().toString());
    }

    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public Object getData() { return data; }
    public void setData(Object data) { this.data = data; }

    public String getTimestamp() { return timestamp; }
    public void setTimestamp(String timestamp) { this.timestamp = timestamp; }
}
