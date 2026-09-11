package com.qpwflshclub.formal_club.workspace;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.server.ResponseStatusException;
@Controller
public class WorkspacePageController {
    private final WorkspaceAccess access;
    public WorkspacePageController(WorkspaceAccess access) { this.access = access; }
    @GetMapping("/page/club/workspace")
    public String page(HttpServletRequest request, Model model) {
        try { model.addAttribute("loginUser", access.current(request)); return "page/club-workspace"; }
        catch (ResponseStatusException e) { return e.getStatusCode().value() == 401 ? "redirect:/page/user/login?next=%2Fpage%2Fclub%2Fworkspace" : "redirect:/page/my-clubs"; }
    }
}
