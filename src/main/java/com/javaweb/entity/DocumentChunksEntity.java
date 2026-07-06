package com.javaweb.entity;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Entity
@Getter
@Setter
@Table(name = "document_chunks")
public class DocumentChunksEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;
	
	@Column(name = "chunk_index")
	private Long chunkIndex;
	
	@Column(name = "page_number")
	private Long pageNumber;
	
	@Column(name = "content")
	private String content;
	
	@Column(name = "created_at")
	private LocalDateTime createdAt;
	
	@Column(name = "embedding")
	private String embedding;
	
	@OneToMany(mappedBy = "chunkId")
	private List<MessageFileRefsEntity> messageFileRefsEntities = new ArrayList<>();
	
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "document_id")
	private DocumentsEntity chunkDocumentId;
}
