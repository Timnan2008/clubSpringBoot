package com.qpwflshclub.formal_club.repository.User;

import com.qpwflshclub.formal_club.pojo.User.Teacher;
import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TeacherRepository extends CrudRepository<Teacher, Long> {
    Optional<Teacher> findByTeacherNameEn(String userNameEn);
}
