package com.qpwflshclub.formal_club.social.repository;

import jakarta.persistence.*;

@Entity
@Table(name = "chat_archive")
public class ChatArchiveRow {

    @Id
    @Column(length = 80)
    public String id;

    @Column(length = 64, nullable = false)
    public String sender;

    @Column(length = 64, nullable = false)
    public String recipient;

    @Column(name = "created_at", length = 64, nullable = false)
    public String createdAt;

    @Column(nullable = false, columnDefinition = "TINYINT(1)")
    public boolean readable;

    @Column(nullable = false, columnDefinition = "TINYINT(1)")
    public boolean recalled;

    @Column(name = "archived_at", length = 64, nullable = false)
    public String archivedAt;

    @Column(length = 32, nullable = false)
    public String iv;

    @Column(columnDefinition = "TEXT", nullable = false)
    public String body;

    public ChatArchiveRow() {}
}
