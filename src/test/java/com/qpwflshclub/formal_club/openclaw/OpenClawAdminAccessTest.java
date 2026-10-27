package com.qpwflshclub.formal_club.openclaw;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.qpwflshclub.formal_club.User.pojo.*;
import com.qpwflshclub.formal_club.social.service.SchoolAccounts;
import com.qpwflshclub.formal_club.workspace.service.WorkspaceAccess;
import java.io.ByteArrayOutputStream;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.server.ResponseStatusException;

class OpenClawAdminAccessTest {

    SchoolAccounts accounts;
    OpenClawAccess access;
    OpenClawAgent agent;
    OpenClawGateway gateway;
    OpenClawRuns runs;
    OpenClawTools tools;
    OpenClawHistory history;
    OpenClawFiles files;
    OpenClawQuota quota;
    WorkspaceAccess workspace;
    MockMvc mvc;

    @BeforeEach
    void setup() {
        accounts = mock(SchoolAccounts.class);
        access = new OpenClawAccess(accounts);
        agent = mock(OpenClawAgent.class);
        gateway = mock(OpenClawGateway.class);
        runs = mock(OpenClawRuns.class);
        tools = mock(OpenClawTools.class);
        history = mock(OpenClawHistory.class);
        files = mock(OpenClawFiles.class);
        quota = mock(OpenClawQuota.class);
        workspace = mock(WorkspaceAccess.class);
        mvc = MockMvcBuilders.standaloneSetup(
            new OpenClawController(
                access,
                accounts,
                workspace,
                gateway,
                agent,
                history,
                quota,
                files,
                mock(OpenClawApprovals.class),
                tools,
                runs
            )
        ).build();
    }

    @Test
    void administratorsCanOpenAndSendThroughTheReenabledService() throws Exception {
        Admin admin = new Admin();
        admin.setId(7L);
        when(accounts.current(any())).thenReturn(admin);
        when(accounts.view(admin)).thenReturn(
            new SchoolAccounts.Account("admin:7", "Admin", "Admin", "admin")
        );
        when(gateway.configured()).thenReturn(true);
        when(workspace.token(any())).thenReturn("fixture-token");
        when(quota.remainingText(eq(admin), anyBoolean())).thenReturn("remaining");
        assertTrue(access.allowed(admin));
        mvc.perform(get("/page/openclaw"))
            .andExpect(status().isOk())
            .andExpect(view().name("page/openclaw"))
            .andExpect(header().string("Cache-Control", "no-store"));
        mvc.perform(get("/api/openclaw/bootstrap"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.connected").value(true))
            .andExpect(jsonPath("$.account.role").value("admin"))
            .andExpect(jsonPath("$.disabledAt").doesNotExist());
        mvc.perform(
            post("/api/openclaw/chat")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"conversationId\":\"11111111-1111-1111-1111-111111111111\",\"text\":\"test\",\"model\":\"flash\",\"reasoning\":false}"
                )
        ).andExpect(status().isOk());
        verify(agent).reply(
            eq(admin),
            anyString(),
            anyString(),
            eq(false),
            anyString(),
            anyList(),
            anyBoolean(),
            nullable(List.class),
            any(),
            any()
        );
    }

    @Test
    void nonAdministratorsCannotBypassNavigationThroughAnyAgentEndpoint() throws Exception {
        ClubPresident vice = new ClubPresident();
        vice.setVicePresident(true);
        assertFalse(access.allowed(null));
        for (UserBase user : new UserBase[] {
            new User(),
            new Teacher(),
            new ClubPresident(),
            vice,
        }) {
            when(accounts.current(any())).thenReturn(user);
            assertFalse(access.allowed(user));
            mvc.perform(get("/page/openclaw")).andExpect(status().isForbidden());
            for (String path : new String[] {
                "/bootstrap",
                "/history",
                "/runs",
                "/runs/stream",
                "/files/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            })
                mvc.perform(get("/api/openclaw" + path)).andExpect(status().isForbidden());
            for (String path : new String[] {
                "/chat",
                "/runs",
                "/approve",
                "/rollback",
                "/runs/test/stop",
            })
                mvc.perform(
                    post("/api/openclaw" + path)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}")
                ).andExpect(status().isForbidden());
            mvc.perform(
                put("/api/openclaw/history").contentType(MediaType.APPLICATION_JSON).content("{}")
            ).andExpect(status().isForbidden());
            mvc.perform(delete("/api/openclaw/runs/test")).andExpect(status().isForbidden());
            mvc.perform(
                delete("/api/openclaw/files/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
            ).andExpect(status().isForbidden());
        }
        verifyNoInteractions(gateway, agent, runs, tools, history, files, quota, workspace);
        verify(accounts, never()).view(any());
    }

    @Test
    void internalModelAndBackgroundEntryPointsAlsoRejectNonAdministrators() {
        var materials = mock(OpenClawMaterials.class);
        var engine = new OpenClawAgent(gateway, tools, materials, new ObjectMapper());
        var background = new OpenClawRuns(
            engine,
            history,
            mock(OpenClawApprovals.class),
            new ObjectMapper()
        );
        for (UserBase user : new UserBase[] { new User(), new Teacher(), new ClubPresident() }) {
            assertEquals(
                403,
                assertThrows(ResponseStatusException.class, () ->
                    engine.reply(
                        user,
                        "test",
                        "test",
                        false,
                        "test",
                        List.of(),
                        false,
                        null,
                        new ByteArrayOutputStream()
                    )
                )
                    .getStatusCode()
                    .value()
            );
            assertEquals(
                403,
                assertThrows(ResponseStatusException.class, () ->
                    background.start(user, null, null, null, "test", "test", false, null)
                )
                    .getStatusCode()
                    .value()
            );
        }
        verifyNoInteractions(gateway, tools, materials, history);
    }
}
