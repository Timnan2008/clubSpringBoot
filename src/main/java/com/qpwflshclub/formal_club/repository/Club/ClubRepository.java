package com.qpwflshclub.formal_club.repository.Club;

import com.qpwflshclub.formal_club.pojo.Club.Club;
import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

@Repository
public interface ClubRepository extends CrudRepository<Club, Integer> {
    Optional<Club> findByClubNameEn(String clubName);

    @Query("select c from Club c where " +
           "lower(c.clubName) like lower(concat('%', :keyword, '%')) or " +
           "lower(c.clubDescription) like lower(concat('%', :keyword, '%')) or " +
           "lower(c.clubNameEn) like lower(concat('%', :keyword, '%')) or " +
           "lower(c.clubDescriptionEn) like lower(concat('%', :keyword, '%'))")
    List<Club> searchByKeyword(@Param("keyword") String keyword);
}
