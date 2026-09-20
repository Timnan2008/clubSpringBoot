package com.qpwflshclub.formal_club.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * 首页入口（gyhchang-cell）。
 *
 * <p>只干一件事：访问网址 <code>/</code>（根路径）时，交给 <code>templates/page/index.html</code> 渲染。
 * 页面里的数据由 PageController / 模板片段自己去取，这里不做业务。
 */
@Controller
public class HomeController {

    /** 浏览器打开网站首页时走这里。 */
    @GetMapping("/")
    public String home() {
        return "page/index";
    }
}
