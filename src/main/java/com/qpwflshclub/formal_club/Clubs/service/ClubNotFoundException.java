package com.qpwflshclub.formal_club.Clubs.service;

public class ClubNotFoundException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    public ClubNotFoundException(String message) {
        super(message);
    }
}
