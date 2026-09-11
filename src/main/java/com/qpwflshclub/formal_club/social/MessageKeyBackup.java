package com.qpwflshclub.formal_club.social;
import jakarta.persistence.*;
@Entity @Table(name="message_key_backup")
public class MessageKeyBackup {
 @Id @Column(length=64) public String account;
 @Column(columnDefinition="TEXT",nullable=false) public String envelope;
 @Version public Long version;
 public MessageKeyBackup(){} public MessageKeyBackup(String account,String envelope){this.account=account;this.envelope=envelope;}
}
