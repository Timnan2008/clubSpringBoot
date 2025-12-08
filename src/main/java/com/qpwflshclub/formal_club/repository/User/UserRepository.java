package com.qpwflshclub.formal_club.repository.User;

import com.qpwflshclub.formal_club.pojo.User.User;
import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends CrudRepository<User, Long> {
    Optional<User> findByUsernameEn(String usernameEn);
}
