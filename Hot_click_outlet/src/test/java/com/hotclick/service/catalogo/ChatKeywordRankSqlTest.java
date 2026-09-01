package com.hotclick.service.catalogo;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("SQL de rank ILIKE del chat")
class ChatKeywordRankSqlTest {

    @Test
    @DisplayName("ORDER BY preferencia foto + score; bind 4 params por término")
    void orderYBind() {
        String order = ChatKeywordRankSql.orderByRelevancia(1, 2);
        assertThat(order).contains("imagen_principal_url");
        assertThat(order).contains("nombre_producto");

        List<Object> params = new ArrayList<>();
        ChatKeywordRankSql.bindScoreTerminos(params, List.of("sala", "living"));
        assertThat(params).hasSize(8);
        assertThat(params.get(0)).isEqualTo("%sala%");
        assertThat(ChatKeywordRankSql.paramsPorTerminoScore()).isEqualTo(4);
    }
}
