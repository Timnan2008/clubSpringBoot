package com.qpwflshclub.formal_club.User.repository;

import com.qpwflshclub.formal_club.User.pojo.User;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserRepository extends CrudRepository<User, Long> {
    Optional<User> findByUsernameEn(String usernameEn);
    User findByEmail(String email);

    @Query("select distinct u from User u left join fetch u.clubs")
    List<User> findAllWithClubs();
}
