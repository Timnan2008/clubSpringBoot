package com.qpwflshclub.formal_club.openclaw;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.qpwflshclub.formal_club.User.pojo.*;
import com.qpwflshclub.formal_club.social.service.SchoolAccounts;
import com.qpwflshclub.formal_club.workspace.service.WorkspaceAccess;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.server.ResponseStatusException;

class OpenClawAccessTest {

    SchoolAccounts accounts;
    WorkspaceAccess workspace;
    OpenClawFiles files;
    MockMvc mvc;

    @BeforeEach
    void setup() {
        accounts = mock(SchoolAccounts.class);
        workspace = mock(WorkspaceAccess.class);
        files = mock(OpenClawFiles.class);
        when(workspace.token(any())).thenReturn("workspace-token");
        OpenClawQuota quota = mock(OpenClawQuota.class);
        when(quota.remainingText(anyLong())).thenReturn("本周剩余 3.00 元");
        when(
            quota.remainingText(
                any(com.qpwflshclub.formal_club.User.pojo.UserBase.class),
                anyBoolean()
            )
        ).thenReturn("本周剩余 3.00 元");
        mvc = MockMvcBuilders.standaloneSetup(
            new OpenClawController(
                new OpenClawAccess(accounts),
                accounts,
                workspace,
                new OpenClawGateway(new ObjectMapper(), "", ""),
                mock(OpenClawAgent.class),
                mock(OpenClawHistory.class),
                quota,
                files,
                new OpenClawApprovals(),
                mock(OpenClawTools.class)
            )
        ).build();
    }

    @Test
    void guestsMustLoginAndCannotReadBootstrap() throws Exception {
        when(accounts.current(any())).thenThrow(
            new ResponseStatusException(HttpStatus.UNAUTHORIZED)
        );
        mvc.perform(get("/page/openclaw"))
            .andExpect(status().is3xxRedirection())
            .andExpect(redirectedUrl("/page/user/login?next=%2Fpage%2Fopenclaw"));
        mvc.perform(get("/api/openclaw/bootstrap")).andExpect(status().isUnauthorized());
    }

    @Test
    void studentsCannotBypassHiddenNavigation() throws Exception {
        for (UserBase user : new UserBase[] { new User() }) {
            when(accounts.current(any())).thenReturn(user);
            mvc.perform(get("/page/openclaw")).andExpect(status().isForbidden());
            mvc.perform(get("/api/openclaw/bootstrap")).andExpect(status().isForbidden());
            mvc.perform(
                post("/api/openclaw/chat")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        "{\"conversationId\":\"11111111-1111-1111-1111-111111111111\",\"text\":\"你好\",\"model\":\"flash\"}"
                    )
            ).andExpect(status().isForbidden());
        }
        verify(accounts, never()).view(any());
    }

    @Test
    void presidentsVicePresidentsTeachersAndAdminsCanOpenTheDisconnectedPage() throws Exception {
        ClubPresident vice = new ClubPresident();
        vice.setVicePresident(true);
        for (UserBase user : new UserBase[] {
            new ClubPresident(),
            vice,
            new Teacher(),
            new Admin(),
        }) {
            user.setId(7L);
            when(accounts.current(any())).thenReturn(user);
            when(accounts.view(user)).thenReturn(
                new SchoolAccounts.Account("test", "Name", "Name", "teacher")
            );
            mvc.perform(get("/page/openclaw"))
                .andExpect(status().isOk())
                .andExpect(view().name("page/openclaw"))
                .andExpect(header().string("Cache-Control", "no-store"));
            mvc.perform(get("/api/openclaw/bootstrap"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.connected").value(false))
                .andExpect(jsonPath("$.account.name").value("Name"))
                .andExpect(header().string("Cache-Control", "no-store"));
        }
    }

    @Test
    void suspendedAccountsRemainBlocked() throws Exception {
        when(accounts.current(any())).thenThrow(new ResponseStatusException(HttpStatus.FORBIDDEN));
        mvc.perform(get("/page/openclaw")).andExpect(status().isForbidden());
        mvc.perform(get("/api/openclaw/bootstrap")).andExpect(status().isForbidden());
    }

    @Test
    void generatedFilesAreRemovedOnlyByAnAuthenticatedManualRequest() throws Exception {
        String id = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
        when(accounts.current(any())).thenThrow(
            new ResponseStatusException(HttpStatus.UNAUTHORIZED)
        );
        mvc.perform(delete("/api/openclaw/files/{id}", id)).andExpect(status().isUnauthorized());
        verify(files, never()).remove(anyLong(), anyString());

        Admin admin = new Admin();
        admin.setId(7L);
        doReturn(admin).when(accounts).current(any());
        mvc.perform(delete("/api/openclaw/files/{id}", id)).andExpect(status().isNotFound());
        verify(files, never()).remove(anyLong(), anyString());

        when(files.load(OpenClawIdentity.id(admin), id)).thenReturn(
            new OpenClawFiles.Download("plan.docx", java.nio.file.Path.of("plan.docx"))
        );
        mvc.perform(delete("/api/openclaw/files/{id}", id))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.deleted").value(true));
        verify(workspace, times(2)).mutation(any());
        verify(files).remove(OpenClawIdentity.id(admin), id);
    }
}
