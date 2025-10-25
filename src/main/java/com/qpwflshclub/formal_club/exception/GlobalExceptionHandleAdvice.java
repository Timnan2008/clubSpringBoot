package com.qpwflshclub.formal_club.exception;

import com.qpwflshclub.formal_club.pojo.ResponseMessage;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandleAdvice {

    Logger log = LoggerFactory.getLogger(GlobalExceptionHandleAdvice.class);

    @ExceptionHandler({Exception.class})
    public ResponseMessage handleException(Exception e, HttpServletRequest request, HttpServletResponse response){

        //记录日志
        log.error("请求地址：{}，异常信息：{}", request.getRequestURI(), e.getMessage());

        return new ResponseMessage(500, "error", null);
    }
}
