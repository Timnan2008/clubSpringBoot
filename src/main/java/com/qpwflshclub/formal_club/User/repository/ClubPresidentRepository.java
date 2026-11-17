package com.qpwflshclub.formal_club.User.repository;

import com.qpwflshclub.formal_club.User.pojo.ClubPresident;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ClubPresidentRepository extends CrudRepository<ClubPresident, Long> {
    Optional<ClubPresident> findByUsernameEn(String usernameEn);
    ClubPresident findByEmail(String email);

    @Query("select distinct p from ClubPresident p left join fetch p.clubs left join fetch p.mainClub")
    List<ClubPresident> findAllWithClubs();
}
