package com.qpwflshclub.formal_club.pojo;

import com.fasterxml.jackson.annotation.JsonInclude;
import org.springframework.http.HttpStatus;

import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class ResponseMessage <T>{
    private Integer code;
    private String message;
    private T data;

    public ResponseMessage() {
    }

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
    
    public static <T> ResponseMessage<T> error(T data){
        return  new ResponseMessage<>(HttpStatus.BAD_REQUEST.value(), "错误", data);
    }

    public static <T> ResponseMessage<T> error(){
        return  new ResponseMessage<>(HttpStatus.BAD_REQUEST.value(), "错误", null);
    }

    public static <T> ResponseMessage<T> error(String message){
        return  new ResponseMessage<>(HttpStatus.BAD_REQUEST.value(), message, null);
    }
    // 在 ResponseMessage 类中添加
    public static <T> ResponseMessage<List<T>> success(List<T> data) {
        return new ResponseMessage<>(HttpStatus.OK.value(), "请求成功", data);
    }

    public static <T> ResponseMessage<List<T>> success(List<T> data, String message) {
        return new ResponseMessage<>(HttpStatus.OK.value(), message, data);
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
