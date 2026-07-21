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
import lombok.Getter;
import lombok.Setter;

@Entity
@Getter
@Setter
@Table(name = "chat_message")

public class ChatMessageEntity {
	
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;
	
	@Enumerated(EnumType.STRING)
	@Column(name = "role")
	private ChatMessageRole role;
	
	@Column(name = "content", columnDefinition = "TEXT")
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
}
