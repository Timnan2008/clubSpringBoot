package com.qpwflshclub.formal_club.workspace;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.qpwflshclub.formal_club.Clubs.pojo.Club;
import com.qpwflshclub.formal_club.Clubs.repository.ClubRepository;
import com.qpwflshclub.formal_club.User.pojo.ClubPresident;
import com.qpwflshclub.formal_club.User.service.IUserService;
import com.qpwflshclub.formal_club.social.service.WallFiles;
import com.qpwflshclub.formal_club.workspace.controller.ClubMediaController;
import com.qpwflshclub.formal_club.workspace.service.WorkspaceAccess;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockMultipartFile;

class ClubMediaControllerTest {

    @TempDir
    Path dir;

    ClubMediaController controller;
    ClubRepository clubs;
    Club club;
    MockHttpServletRequest request;

    @BeforeEach
    void setup() {
        var users = mock(IUserService.class);
        clubs = mock(ClubRepository.class);
        club = new Club();
        club.setId(1);
        club.setClubName("Club");
        var leader = new ClubPresident();
        leader.setId(9);
        leader.setEmail("leader@example.com");
        leader.setMainClub(club);
        when(users.findByEmail(leader.getEmail())).thenReturn(leader);
        when(clubs.save(club)).thenReturn(club);
        var access = new WorkspaceAccess(users, clubs);
        controller = new ClubMediaController(
            access,
            clubs,
            new WallFiles(dir.toString()),
            dir.toString()
        );
        request = new MockHttpServletRequest();
        request.getSession().setAttribute("authenticatedEmail", leader.getEmail());
        request.addHeader("X-Workspace-Token", access.token(request));
    }

    private static boolean ffmpegAvailable() {
        try {
            var process = new ProcessBuilder("ffmpeg", "-version")
                .redirectError(ProcessBuilder.Redirect.DISCARD)
                .redirectOutput(ProcessBuilder.Redirect.DISCARD)
                .start();
            return process.waitFor() == 0;
        } catch (Exception e) {
            return false;
        }
    }

    @Test
    void videoUploadRejectsOversizedAndNonMp4Files() {
        var oversized = new MockMultipartFile("file", "clip.mp4", "video/mp4", new byte[] { 0 }) {
            @Override
            public long getSize() {
                return 201L * 1024 * 1024;
            }

            @Override
            public boolean isEmpty() {
                return false;
            }
        };
        assertThatThrownBy(() ->
            controller.upload(1, "video", oversized, request)
        ).hasMessageContaining("200 MB");
        assertThatThrownBy(() ->
            controller.upload(
                1,
                "video",
                new MockMultipartFile("file", "clip.mp4", "video/mp4", "not-a-video".getBytes()),
                request
            )
        ).hasMessageContaining("MP4");
        assertThat(club.getVideo()).isNull();
    }

    @Test
    void videoUploadSavesCompressedMp4() throws Exception {
        Assumptions.assumeTrue(ffmpegAvailable(), "本机没有 ffmpeg，跳过视频上传测试");
        Path source = dir.resolve("source.mp4");
        var proc = new ProcessBuilder(
            "ffmpeg",
            "-nostdin",
            "-y",
            "-v",
            "error",
            "-f",
            "lavfi",
            "-i",
            "testsrc2=size=320x240:rate=12",
            "-t",
            "1",
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            "-an",
            source.toString()
        )
            .redirectError(ProcessBuilder.Redirect.DISCARD)
            .start();
        assertThat(proc.waitFor()).isZero();
        Object result = controller.upload(
            1,
            "video",
            new MockMultipartFile("file", "clip.mp4", "video/mp4", Files.readAllBytes(source)),
            request
        );
        assertThat(result).isInstanceOf(Map.class);
        String url = ((Map<?, ?>) result).get("url").toString();
        assertThat(url).startsWith("/club-media/").endsWith(".mp4");
        assertThat(club.getVideo()).isEqualTo(url);
        assertThat(
            Files.isRegularFile(dir.resolve(url.substring("/club-media/".length())))
        ).isTrue();
        verify(clubs).save(club);
    }
}
