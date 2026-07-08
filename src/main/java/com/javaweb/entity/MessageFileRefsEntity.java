package com.javaweb.entity;

import java.time.LocalDateTime;
import java.util.List;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Entity
@Getter
@Setter
@Table(name = "message_file_refs")
public class MessageFileRefsEntity {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;
	
	@Column(name = "excerpt")
	private String excerpt;
	
	@Column(name = "created_at")
	private LocalDateTime createdAt;
	
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "message_id")
	private ChatMessageEntity messageId;
	
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "document_id")
	private DocumentEntity documentId;
	
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "chunk_id")	
	private DocumentChunkEntity chunkId;
}
