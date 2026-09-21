package com.qpwflshclub.formal_club.config;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.qpwflshclub.formal_club.social.service.SchoolAccounts;
import com.qpwflshclub.formal_club.social.service.SchoolAccounts;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.text.Normalizer;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/** Official student roster. Student sign-up must match name and student number. */
@Service
public class StudentRoster {

    public static final String MISMATCH =
        "学号与姓名不一致，无法注册 / Student number and name do not match.";

    public record Student(
        String studentNumber,
        String name,
        String nameEn,
        String grade,
        String classroom
    ) {}

    private final Map<String, Student> byNumber;
    private final ObjectMapper json = new ObjectMapper();

    public StudentRoster(
        @Value("${club.student-roster-file:./data/accounts/student-roster.json}") String path
    ) throws IOException {
        Path file = Path.of(path);
        if (!Files.exists(file)) {
            byNumber = Map.of();
            return;
        }
        List<Student> rows = json.readValue(
            Files.readAllBytes(file),
            new TypeReference<List<Student>>() {}
        );
        Map<String, Student> next = new LinkedHashMap<>();
        for (Student row : rows) {
            String number = number(row.studentNumber());
            if (number.isEmpty()) continue;
            next.put(
                number,
                new Student(
                    number,
                    Objects.toString(row.name(), "").strip(),
                    Objects.toString(row.nameEn(), "").strip(),
                    Objects.toString(row.grade(), "").strip(),
                    Objects.toString(row.classroom(), "").strip()
                )
            );
        }
        byNumber = Map.copyOf(next);
    }

    public void requireMatchingStudent(String studentNumber, String name, String nameEn) {
        if (byNumber.isEmpty()) throw SchoolAccounts.error(
            503,
            "学生名册未配置，暂不能注册 / Student roster is unavailable"
        );
        Student student = byNumber.get(number(studentNumber));
        if (student == null) throw SchoolAccounts.error(400, MISMATCH);
        String zh = compactName(name);
        String english = englishName(nameEn);
        if (zh.isEmpty() && english.isEmpty()) throw SchoolAccounts.error(
            400,
            "中文名和英文名至少填写一项 / Enter at least one name"
        );
        String rosterZh = compactName(student.name());
        String rosterEn = englishName(student.nameEn());
        boolean zhConflicts = !zh.isEmpty() && !rosterZh.isEmpty() && !zh.equals(rosterZh);
        boolean enConflicts =
            !english.isEmpty() && !rosterEn.isEmpty() && !english.equals(rosterEn);
        boolean zhMatches = !zh.isEmpty() && !rosterZh.isEmpty() && zh.equals(rosterZh);
        boolean enMatches = !english.isEmpty() && !rosterEn.isEmpty() && english.equals(rosterEn);
        if (zhConflicts || enConflicts || (!zhMatches && !enMatches)) {
            throw SchoolAccounts.error(400, MISMATCH);
        }
    }

    static String number(String input) {
        String value = Normalizer.normalize(
            Objects.toString(input, "").strip(),
            Normalizer.Form.NFKC
        ).toUpperCase(Locale.ROOT);
        return value.matches("[A-Z0-9-]{1,32}") ? value : "";
    }

    static String compactName(String input) {
        return Normalizer.normalize(
            Objects.toString(input, "").strip(),
            Normalizer.Form.NFKC
        ).replaceAll("\\s+", "");
    }

    static String englishName(String input) {
        return Normalizer.normalize(Objects.toString(input, "").strip(), Normalizer.Form.NFKC)
            .replaceAll("\\s+", " ")
            .toLowerCase(Locale.ROOT);
    }
}
