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

@Entity
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
	private DocumentEntity chunkDocumentId;

	public Long getId() {
		return id;
	}

	public void setId(Long id) {
		this.id = id;
	}

	public Long getChunkIndex() {
		return chunkIndex;
	}

	public void setChunkIndex(Long chunkIndex) {
		this.chunkIndex = chunkIndex;
	}

	public Long getPageNumber() {
		return pageNumber;
	}

	public void setPageNumber(Long pageNumber) {
		this.pageNumber = pageNumber;
	}

	public String getContent() {
		return content;
	}

	public void setContent(String content) {
		this.content = content;
	}

	public LocalDateTime getCreatedAt() {
		return createdAt;
	}

	public void setCreatedAt(LocalDateTime createdAt) {
		this.createdAt = createdAt;
	}

	public String getEmbedding() {
		return embedding;
	}

	public void setEmbedding(String embedding) {
		this.embedding = embedding;
	}

	public List<MessageFileRefsEntity> getMessageFileRefsEntities() {
		return messageFileRefsEntities;
	}

	public void setMessageFileRefsEntities(List<MessageFileRefsEntity> messageFileRefsEntities) {
		this.messageFileRefsEntities = messageFileRefsEntities;
	}

	public DocumentEntity getChunkDocumentId() {
		return chunkDocumentId;
	}

	public void setChunkDocumentId(DocumentEntity chunkDocumentId) {
		this.chunkDocumentId = chunkDocumentId;
	}
}
