package com.qpwflshclub.formal_club.service.Club;

import com.qpwflshclub.formal_club.pojo.Club.Club;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.time.Clock;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.stream.Stream;

/** Public read model only. Never stores accounts, memberships or managed JPA entities. */
@Service
public class PublicClubCatalog {
    private static final long TTL_MILLIS = 2000;
    private final IClubService source;
    private final Clock clock;
    private volatile Snapshot snapshot;
    @Autowired
    public PublicClubCatalog(IClubService source) { this(source, Clock.systemUTC()); }
    PublicClubCatalog(IClubService source, Clock clock) { this.source=source; this.clock=clock; }

    // One reload per process on expiry, even when many readers arrive together.
    private Snapshot snapshot() {
        Snapshot current=snapshot;
        if(current!=null && clock.millis()<current.expiresAt()) return current;
        synchronized(this) {
            current=snapshot;
            if(current==null || clock.millis()>=current.expiresAt()) {
                List<Entry> entries=source.findAll().stream().map(Entry::from).toList();
                current=new Snapshot(entries,clock.millis()+TTL_MILLIS);
                snapshot=current;
            }
            return current;
        }
    }
    public List<Club> all() { return snapshot().entries().stream().map(Entry::copy).toList(); }
    public List<Club> search(String keyword) {
        if(keyword==null || keyword.isBlank()) return List.of();
        String term=keyword.strip().toLowerCase(Locale.ROOT);
        if(term.length()>200) return List.of();
        return snapshot().entries().stream().filter(e->e.matches(term)).map(Entry::copy).toList();
    }
    private record Snapshot(List<Entry> entries,long expiresAt) {}
    private record Entry(Integer id,String name,String nameEn,String description,String descriptionEn,
                         String brief,String briefEn,String image,String category,String url,boolean great) {
        static Entry from(Club c) { return new Entry(c.getId(),c.getClubName(),c.getClubNameEn(),c.getClubDescription(),c.getClubDescriptionEn(),c.getSortDescription(),c.getSortDescriptionEn(),c.getClubItem(),c.getClubClass(),c.getClubURL(),c.isGreatClub()); }
        boolean matches(String term) { return Stream.of(name,nameEn,description,descriptionEn,brief,briefEn).filter(Objects::nonNull).anyMatch(v->v.toLowerCase(Locale.ROOT).contains(term)); }
        Club copy() { Club c=new Club();c.setId(id);c.setClubName(name);c.setClubNameEn(nameEn);c.setClubDescription(description);c.setClubDescriptionEn(descriptionEn);c.setSortDescription(brief);c.setSortDescriptionEn(briefEn);c.setClubItem(image);c.setClubClass(category);c.setClubURL(url);c.setGreatClub(great);return c; }
    }
}
