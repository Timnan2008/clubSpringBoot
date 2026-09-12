package com.qpwflshclub.formal_club.Clubs.pojo;

import lombok.Data;

@Data
public class SearchResultVO {

    private Integer id;
    private String name;

    private String description;
    private String brief;
    private String logo;
    private String detailPath;
    private String clubURL;
}
