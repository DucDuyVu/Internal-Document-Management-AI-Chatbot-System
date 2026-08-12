package com.javaweb.service.impl;

import com.javaweb.entity.DocumentEntity;
import com.javaweb.entity.UsersEntity;
import com.javaweb.service.PdfSignatureService;
import com.javaweb.service.StorageService;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType0Font;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.InputStream;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Service
public class PdfSignatureServiceImpl implements PdfSignatureService {

    @Autowired
    private StorageService storageService;

    @Override
    public boolean signDocument(DocumentEntity document, UsersEntity manager, Float x, Float y, Integer pageNumber) throws Exception {
        if (document.getFilePath() == null || !document.getFilePath().toLowerCase().endsWith(".pdf")) {
            // Không phải PDF thì bỏ qua đóng dấu
            return false;
        }

        String signatureUrl = manager.getSignatureUrl();
        boolean hasImageSignature = signatureUrl != null && !signatureUrl.trim().isEmpty()
                && !signatureUrl.equals("null");

        // Tải file PDF từ storage (MinIO/S3)
        try (InputStream pdfStream = storageService.downloadFile(document.getFilePath());
                PDDocument pdfDocument = Loader.loadPDF(pdfStream.readAllBytes())) {

            int numberOfPages = pdfDocument.getNumberOfPages();
            if (numberOfPages == 0)
                return false;

            PDPage targetPage;
            boolean isNewPage = false;
            if (x == null || y == null) {
                // Phương án 1: Thêm trang mới vào cuối PDF
                targetPage = new PDPage(org.apache.pdfbox.pdmodel.common.PDRectangle.A4);
                pdfDocument.addPage(targetPage);
                isNewPage = true;
            } else {
                // Phương án 2: Ký tại toạ độ
                int targetPageIndex = numberOfPages - 1;
                if (pageNumber != null && pageNumber > 0 && pageNumber <= numberOfPages) {
                    targetPageIndex = pageNumber - 1;
                }
                targetPage = pdfDocument.getPage(targetPageIndex);
            }

            float pageWidth = targetPage.getMediaBox().getWidth();
            float pageHeight = targetPage.getMediaBox().getHeight();

            PDType0Font fontBold = null;
            PDType0Font fontItalic = null;
            PDType0Font fontRegular = null;
            try {
                fontBold = PDType0Font.load(pdfDocument, new File("src/main/resources/fonts/Roboto-Bold.ttf"));
                fontItalic = PDType0Font.load(pdfDocument, new File("src/main/resources/fonts/Roboto-Italic.ttf"));
                fontRegular = PDType0Font.load(pdfDocument, new File("src/main/resources/fonts/Roboto-Regular.ttf"));
            } catch (Exception e) {
                System.err.println("Could not load fonts: " + e.getMessage());
            }

            try (PDPageContentStream contentStream = new PDPageContentStream(pdfDocument, targetPage,
                    PDPageContentStream.AppendMode.APPEND, true, true)) {

                float boxWidth = 220f;
                float startX = (x != null) ? x : (pageWidth - boxWidth - 40);
                float currentY = (y != null) ? y : (pageHeight - 100); // Ký ở đầu trang mới nếu dùng Phương án 1

                String managerName = manager.getFullName() != null && !manager.getFullName().isBlank()
                        ? manager.getFullName()
                        : manager.getUserName();

                // --- Tiêu đề ---
                contentStream.beginText();
                if (fontBold != null) {
                    contentStream.setFont(fontBold, 10);
                } else {
                    contentStream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 10);
                }
                contentStream.newLineAtOffset(startX, currentY);
                contentStream.showText(fontBold != null ? "NGƯỜI PHÊ DUYỆT" : "NGUOI PHE DUYET");
                contentStream.endText();

                currentY -= 4;

                // --- Đường kẻ ngang dưới tiêu đề ---
                contentStream.setLineWidth(0.8f);
                contentStream.moveTo(startX, currentY);
                contentStream.lineTo(startX + boxWidth, currentY);
                contentStream.stroke();

                currentY -= 16;

                // --- Ảnh chữ ký hoặc tên in đậm ---
                if (hasImageSignature) {
                    try {
                        String localPathStr = signatureUrl.startsWith("/") ? signatureUrl.substring(1) : signatureUrl;
                        File sigFile = Paths.get(localPathStr).toFile();

                        if (sigFile.exists()) {
                            PDImageXObject pdImage = PDImageXObject.createFromFileByExtension(sigFile, pdfDocument);
                            float imgWidth = pdImage.getWidth();
                            float imgHeight = pdImage.getHeight();
                            // Scale: max width 160, max height 70
                            float scale = Math.min(160f / imgWidth, 70f / imgHeight);
                            float scaledW = imgWidth * scale;
                            float scaledH = imgHeight * scale;
                            // Căn giữa ảnh trong boxWidth
                            float imgX = startX + (boxWidth - scaledW) / 2f;
                            contentStream.drawImage(pdImage, imgX, currentY - scaledH, scaledW, scaledH);
                            currentY -= (scaledH + 8);
                        } else {
                            // File ảnh không tồn tại -> in tên đậm thay thế
                            contentStream.beginText();
                            if (fontBold != null) {
                                contentStream.setFont(fontBold, 12);
                            } else {
                                contentStream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 12);
                            }
                            contentStream.newLineAtOffset(startX, currentY);
                            contentStream.showText(fontBold != null ? managerName : stripAccents(managerName));
                            contentStream.endText();
                            currentY -= 20;
                        }
                    } catch (Exception e) {
                        e.printStackTrace();
                        contentStream.beginText();
                        if (fontBold != null) {
                            contentStream.setFont(fontBold, 12);
                        } else {
                            contentStream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 12);
                        }
                        contentStream.newLineAtOffset(startX, currentY);
                        contentStream.showText(fontBold != null ? managerName : stripAccents(managerName));
                        contentStream.endText();
                        currentY -= 20;
                    }
                } else {
                    // Không có ảnh -> in tên đậm làm "chữ ký"
                    contentStream.beginText();
                    if (fontBold != null) {
                        contentStream.setFont(fontBold, 13);
                    } else {
                        contentStream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 13);
                    }
                    contentStream.newLineAtOffset(startX, currentY);
                    contentStream.showText(fontBold != null ? managerName : stripAccents(managerName));
                    contentStream.endText();
                    currentY -= 22;
                }

                // --- Đường kẻ ngang phân cách trước họ tên ---
                contentStream.setLineWidth(0.5f);
                contentStream.moveTo(startX, currentY);
                contentStream.lineTo(startX + boxWidth, currentY);
                contentStream.stroke();

                currentY -= 13;

                // --- Họ và tên người xác nhận ---
                contentStream.beginText();
                if (fontBold != null) {
                    contentStream.setFont(fontBold, 10);
                } else {
                    contentStream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 10);
                }
                contentStream.newLineAtOffset(startX, currentY);
                contentStream.showText(fontBold != null ? managerName : stripAccents(managerName));
                contentStream.endText();

                currentY -= 14;

                // --- Chức danh ---
                String jobTitle = manager.getJobTitle() != null && !manager.getJobTitle().isBlank()
                        ? manager.getJobTitle()
                        : "Trưởng phòng";
                contentStream.beginText();
                if (fontItalic != null) {
                    contentStream.setFont(fontItalic, 9);
                } else {
                    contentStream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_OBLIQUE), 9);
                }
                contentStream.newLineAtOffset(startX, currentY);
                contentStream.showText(fontItalic != null ? jobTitle : stripAccents(jobTitle));
                contentStream.endText();

                currentY -= 13;

                // --- Ngày ký ---
                DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
                String dateStr = LocalDateTime.now().format(formatter);
                contentStream.beginText();
                if (fontRegular != null) {
                    contentStream.setFont(fontRegular, 9);
                } else {
                    contentStream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 9);
                }
                contentStream.newLineAtOffset(startX, currentY);
                contentStream.showText(fontRegular != null ? "Ngày ký: " + dateStr : "Ngay ky: " + dateStr);
                contentStream.endText();

                currentY -= 11;

                // --- Nhãn hệ thống ---
                contentStream.beginText();
                if (fontItalic != null) {
                    contentStream.setFont(fontItalic, 8);
                } else {
                    contentStream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_OBLIQUE), 8);
                }
                contentStream.newLineAtOffset(startX, currentY);
                contentStream.showText(fontItalic != null ? "Ký duyệt điện tử qua Hệ thống IDMS" : "Ky duyet dien tu qua He thong IDMS");
                contentStream.endText();
            }

            // Ghi ra byte array
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            pdfDocument.save(baos);
            byte[] signedPdfBytes = baos.toByteArray();

            // Ghi đè file PDF đã ký lên storage (MinIO/S3)
            storageService.overwriteFile(document.getFilePath(), signedPdfBytes, "application/pdf");

            // Cập nhật size nếu muốn, nhưng document size thường là field gốc, để nguyên
            // cũng không sao.
            return true;
        }
    }

    private String stripAccents(String s) {
        if (s == null)
            return null;
        String normalized = java.text.Normalizer.normalize(s, java.text.Normalizer.Form.NFD);
        String noAccents = normalized.replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
        return noAccents.replace('đ', 'd').replace('Đ', 'D');
    }
}
