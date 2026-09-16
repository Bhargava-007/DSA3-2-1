package com.resolve.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "datasets")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Dataset {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "filename", length = 500, nullable = false)
    private String filename;

    @Column(name = "record_count")
    private Long recordCount;

    @Column(name = "file_size_mb", precision = 8, scale = 2)
    private BigDecimal fileSizeMb;

    @Column(name = "status", length = 50)
    private String status; // UPLOADED, PROCESSING, COMPLETE, FAILED

    @Column(name = "uploaded_at", updatable = false)
    private LocalDateTime uploadedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @PrePersist
    protected void onCreate() {
        if (uploadedAt == null) {
            uploadedAt = LocalDateTime.now();
        }
        if (status == null) {
            status = "UPLOADED";
        }
    }
}
