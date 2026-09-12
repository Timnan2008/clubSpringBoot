package com.qpwflshclub.formal_club.Clubs.repository;

import com.qpwflshclub.formal_club.Clubs.pojo.Club;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.CrudRepository;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ClubRepository extends CrudRepository<Club, Integer> {
    List<Club> findAll();
    Optional<Club> findByClubNameEn(String clubName);

    @org.springframework.data.jpa.repository.Lock(
        jakarta.persistence.LockModeType.PESSIMISTIC_WRITE
    )
    @Query("select c from Club c where c.clubNameEn = :name")
    Optional<Club> lockByName(@Param("name") String name);

    @Query(
        "select c from Club c where " +
            "lower(c.clubName) like lower(concat('%', :keyword, '%')) or " +
            "lower(c.clubDescription) like lower(concat('%', :keyword, '%')) or " +
            "lower(c.clubNameEn) like lower(concat('%', :keyword, '%')) or " +
            "lower(c.clubDescriptionEn) like lower(concat('%', :keyword, '%'))"
    )
    List<Club> searchByKeyword(@Param("keyword") String keyword);
}
