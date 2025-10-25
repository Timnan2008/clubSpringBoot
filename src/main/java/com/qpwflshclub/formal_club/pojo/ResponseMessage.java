package com.qpwflshclub.formal_club.pojo;

import org.springframework.http.HttpStatus;

public class ResponseMessage <T>{
    private Integer code;
    private String message;
    private T data;

    public ResponseMessage(Integer code, String message, T data) {
        this.code = code;
        this.message = message;
        this.data = data;
    }

    //接口请求成功
    public static <T> ResponseMessage<T> success(T data){
        return  new ResponseMessage<>(HttpStatus.OK.value(), "请求成功", data);
    }

    public static <T> ResponseMessage<T> success(){
        return  new ResponseMessage<>(HttpStatus.OK.value(), "请求成功", null);
    }

    public Integer getCode() {
        return code;
    }

    public void setCode(Integer code) {
        this.code = code;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public T getData() {
        return data;
    }

    public void setData(T data) {
        this.data = data;
    }
}
