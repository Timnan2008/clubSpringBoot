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

    @ExceptionHandler(org.springframework.web.server.ResponseStatusException.class)
    public org.springframework.http.ResponseEntity<?> status(org.springframework.web.server.ResponseStatusException e) {
        return org.springframework.http.ResponseEntity.status(e.getStatusCode()).body(new ResponseMessage<>(e.getStatusCode().value(),e.getReason(),null));
    }

    @ExceptionHandler(org.springframework.web.servlet.resource.NoResourceFoundException.class)
    public org.springframework.http.ResponseEntity<?> missingResource() {
        return org.springframework.http.ResponseEntity.notFound().build();
    }

    @ExceptionHandler(org.springframework.web.bind.MethodArgumentNotValidException.class)
    public org.springframework.http.ResponseEntity<?> invalid(){return org.springframework.http.ResponseEntity.badRequest().body(new ResponseMessage<>(400,"请检查填写的信息 / Please check your details",null));}

    Logger log = LoggerFactory.getLogger(GlobalExceptionHandleAdvice.class);

    @ExceptionHandler({Exception.class})
    public ResponseMessage handleException(Exception e, HttpServletRequest request, HttpServletResponse response){

        //记录日志
        log.error("请求地址：{}，异常信息：{}", request.getRequestURI(), e.getMessage());

        response.setStatus(500);
        return new ResponseMessage(500, "error", null);
    }
}
