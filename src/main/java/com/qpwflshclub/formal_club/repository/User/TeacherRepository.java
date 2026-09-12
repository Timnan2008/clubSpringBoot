package com.qpwflshclub.formal_club.repository.User;

import com.qpwflshclub.formal_club.pojo.User.Teacher;
import java.util.Optional;
import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TeacherRepository extends CrudRepository<Teacher, Long> {
    Optional<Teacher> findByTeacherNameEn(String userNameEn);
    Teacher findByEmail(String email);
}
