package com.qpwflshclub.formal_club.pojo.dto.Suggestion;


import jakarta.persistence.Column;
import jakarta.validation.constraints.NotNull;

public class SuggestionDTO {
    private Long id;

    @NotNull(message = "内容不能为空")
    private String context;

    @NotNull(message = "是否为匿名不能为空")
    private boolean isAnonymous;

    @NotNull(message = "标题不能为空")
    private String title;

    private String Name;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getContext() {
        return context;
    }

    public void setContext(String context) {
        this.context = context;
    }

    public boolean isAnonymous() {
        return isAnonymous;
    }

    public void setAnonymous(boolean anonymous) {
        isAnonymous = anonymous;
    }

    public String getName() {
        return Name;
    }

    public void setName(String name) {
        Name = name;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }
}
