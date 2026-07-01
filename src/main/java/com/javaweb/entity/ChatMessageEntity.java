package com.javaweb.entity;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import com.javaweb.enums.ChatMessageRole;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;

@Entity
@Table(name = "chat_message")
public class ChatMessageEntity {
	
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;
	
	@Enumerated(EnumType.STRING)
	@Column(name = "role")
	private ChatMessageRole role;
	
	@Column(name = "content")
	private String content;
	
	@Column(name = "token_count")
	private Long tokenCount;
	
	@Column(name = "created_at")
	private LocalDateTime createdAt;
	
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "session_id")
	private ChatSessionsEntity sessionId;
	
	
	@OneToMany(mappedBy = "messageId", fetch = FetchType.LAZY)
	private List<MessageFileRefsEntity> messageFileRefsEntities = new ArrayList<>();

	public Long getId() {
		return id;
	}

	public void setId(Long id) {
		this.id = id;
	}

	public ChatMessageRole getRole() {
		return role;
	}

	public void setRole(ChatMessageRole role) {
		this.role = role;
	}

	public String getContent() {
		return content;
	}

	public void setContent(String content) {
		this.content = content;
	}

	public Long getTokenCount() {
		return tokenCount;
	}

	public void setTokenCount(Long tokenCount) {
		this.tokenCount = tokenCount;
	}

	public LocalDateTime getCreatedAt() {
		return createdAt;
	}

	public void setCreatedAt(LocalDateTime createdAt) {
		this.createdAt = createdAt;
	}

	public ChatSessionsEntity getSessionId() {
		return sessionId;
	}

	public void setSessionId(ChatSessionsEntity sessionId) {
		this.sessionId = sessionId;
	}

	public List<MessageFileRefsEntity> getMessageFileRefsEntities() {
		return messageFileRefsEntities;
	}

	public void setMessageFileRefsEntities(List<MessageFileRefsEntity> messageFileRefsEntities) {
		this.messageFileRefsEntities = messageFileRefsEntities;
	}
}
