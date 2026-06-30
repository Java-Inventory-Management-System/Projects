package org.dawn.backend.config.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.domain.Page;

import java.util.List;

@Data
@NoArgsConstructor
public class ResponsePage<T> {
    @JsonInclude(JsonInclude.Include.NON_NULL)
    List<T> content;

    Pagination pagination;

    public static <T> ResponsePage<T> of(Page<T> page) {
        return new ResponsePage<>(page);
    }

    public ResponsePage(Page<T> page) {
        this.content = page.getContent();
        this.pagination = new Pagination(
                page.getPageable().getPageNumber(),
                page.getPageable().getPageSize(),
                page.getTotalElements(),
                page.getTotalPages()
        );
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    static class Pagination {
        Integer pageNumber;
        Integer pageSize;
        Long totalElements;
        Integer totalPages;
    }
}