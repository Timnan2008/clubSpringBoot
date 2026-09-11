package com.qpwflshclub.formal_club.workspace;

import com.qpwflshclub.formal_club.pojo.User.*;
import com.qpwflshclub.formal_club.pojo.Club.Club;
import com.qpwflshclub.formal_club.repository.Club.ClubRepository;
import com.qpwflshclub.formal_club.service.User.IUserService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;

@Service
public class WorkspaceAccess {
    @org.springframework.beans.factory.annotation.Autowired private com.qpwflshclub.formal_club.social.OfficerAssignments officers;
    private final IUserService users;
    private final ClubRepository clubs;
    public WorkspaceAccess(IUserService users, ClubRepository clubs) { this.users = users; this.clubs = clubs; }
    public UserBase current(HttpServletRequest request) {
        var session = request.getSession(false);
        if (session == null || !(session.getAttribute("authenticatedEmail") instanceof String email))
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "请重新登录后进入社团管理");
        UserBase user = users.findByEmail(email);
        if (!(user instanceof ClubPresident) && !(user instanceof Teacher) && !(user instanceof Admin) && (user==null||additional(user).isEmpty()))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "此页面仅向社长、副社长和教师开放");
        return user;
    }
    public UserBase reviewer(HttpServletRequest request) {
        var session=request.getSession(false);
        if(session==null || !(session.getAttribute("authenticatedEmail") instanceof String email)) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        UserBase user=users.findByEmail(email);
        if(!(user instanceof Admin)) throw new ResponseStatusException(HttpStatus.FORBIDDEN,"校园活动申请由管理员审核");
        return user;
    }
    public boolean admin(UserBase user) { return user instanceof Admin; }
    public List<Club> clubs(UserBase user) {
        if(user instanceof Admin)return clubs.findAll();
        Map<Integer,Club> result=new LinkedHashMap<>();
        if(user instanceof ClubPresident p&&p.getMainClub()!=null)result.put(p.getMainClub().getId(),p.getMainClub());
        if(user instanceof Teacher t&&t.getClubs()!=null)for(var c:t.getClubs())result.put(c.getId(),c);
        for(var c:additional(user))result.put(c.getId(),c);return List.copyOf(result.values());
    }
    private List<Club> additional(UserBase user){if(officers==null)return List.of();return officers.forAccount(com.qpwflshclub.formal_club.social.SchoolAccounts.key(user.getEmail())).stream().map(o->clubs.findById(o.club()).orElse(null)).filter(Objects::nonNull).toList();}
    public boolean vice(UserBase user,int id){if(user instanceof ClubPresident p&&p.getMainClub()!=null&&p.getMainClub().getId()==id)return p.isVicePresident();return officers!=null&&officers.forAccount(com.qpwflshclub.formal_club.social.SchoolAccounts.key(user.getEmail())).stream().anyMatch(o->o.club()==id&&o.position().equals("vice_president"));}

    public Club require(UserBase user, int id) {
        return clubs(user).stream().filter(c -> Objects.equals(c.getId(), id)).findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "你无权管理这个社团"));
    }
    public String token(HttpServletRequest request) {
        var session = request.getSession();
        synchronized (session) {
            if (session.getAttribute("workspaceToken") == null) session.setAttribute("workspaceToken", UUID.randomUUID().toString());
            return (String) session.getAttribute("workspaceToken");
        }
    }
    public void mutation(HttpServletRequest request) {
        String expected = (String) request.getSession().getAttribute("workspaceToken");
        if (expected == null || !expected.equals(request.getHeader("X-Workspace-Token")))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "页面已过期，请刷新后重试");
    }
}
