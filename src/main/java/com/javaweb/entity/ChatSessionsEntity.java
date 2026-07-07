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
@Table(name = "chat_sessions")
@Getter
@Setter
public class ChatSessionsEntity {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;
	
	@Column(name = "title")
	private String title;
	
	@Column(name = "created_at")
	private LocalDateTime createdAt;
	
	@Column(name = "update_at")
	private LocalDateTime updateAt;
	
	@Column(name = "delete_at")
	private LocalDateTime deletedAt;
	
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "user_id")
	private UsersEntity userChatId;
	
	@OneToMany(mappedBy = "sessionId", fetch = FetchType.LAZY)
	private List<ChatMessageEntity> chatMessageEntities = new ArrayList<>();	
}
