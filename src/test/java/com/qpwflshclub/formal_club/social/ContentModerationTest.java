package com.qpwflshclub.formal_club.social;

import static org.assertj.core.api.Assertions.*;

import org.junit.jupiter.api.Test;

class ContentModerationTest {

    @Test
    void rejectsInsultsAndAllowsOrdinaryCampusText() {
        assertThatThrownBy(() -> ContentModeration.check("这人真傻逼")).hasMessageContaining(
            "不适当"
        );
        assertThatThrownBy(() -> ContentModeration.check("What the fuck")).hasMessageContaining(
            "inappropriate"
        );
        assertThatThrownBy(() -> ContentModeration.check("傻 逼")).hasMessageContaining("不适当");
        assertThatThrownBy(() -> ContentModeration.check("nmsl")).hasMessageContaining("不适当");
        assertThatCode(() ->
            ContentModeration.check("把社团招新改到中午，操作更方便。")
        ).doesNotThrowAnyException();
        assertThat(ContentModeration.blocked("e2ee:v1:ciphertext-fuck")).isFalse();
        assertThat(ContentModeration.blocked("周末有人代考吗")).isTrue();
        assertThat(ContentModeration.blocked("wdnmd")).isTrue();
        assertThat(ContentModeration.blocked("this is porn")).isTrue();
        assertThat(ContentModeration.blocked("把社团招新改到中午，操作更方便。")).isFalse();
        assertThat(ContentModeration.blocked("下午在草地上集合，看日程安排")).isFalse();
        assertThat(ContentModeration.blocked("历史社讲司马懿")).isFalse();
        assertThat(ContentModeration.blocked("class assignment for biology")).isFalse();
    }

    @Test
    void masksKnownWordsForExistingContent() {
        assertThat(ContentModeration.mask("不要说fuck这种话"))
            .contains("****")
            .doesNotContain("fuck");
        assertThat(ContentModeration.mask("课堂讨论社团活动")).isEqualTo("课堂讨论社团活动");
    }
}
