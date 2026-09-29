package com.resolve.service;

import com.resolve.model.Dataset;
import com.resolve.model.Product;
import com.resolve.repository.DatasetRepository;
import com.resolve.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.apache.commons.io.input.BOMInputStream;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class CsvIngestionService {

    private final DatasetRepository datasetRepository;
    private final ProductRepository productRepository;

    private static final List<String> ID_COLS = List.of("product_id", "product id", "id", "asin", "sku", "item_id", "pid");
    private static final List<String> TITLE_COLS = List.of("title", "product_title", "product title", "name", "product_name", "product name", "item_name");
    private static final List<String> DESC_COLS = List.of("description", "product_description", "product description", "desc", "item_description");
    private static final List<String> BRAND_COLS = List.of("brand", "brand_name", "brand name", "manufacturer", "brand/manufacturer");
    private static final List<String> PRICE_COLS = List.of("price", "selling_price", "selling price", "mrp", "sale_price", "sale price", "amount");
    private static final List<String> CAT_COLS = List.of("category", "product_category", "product category", "main_category", "main category");
    private static final List<String> SOURCE_COLS = List.of("source", "platform", "marketplace", "site", "retailer", "store");

    @Transactional
    public Dataset ingestCsv(MultipartFile file) throws Exception {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Uploaded file is empty or missing");
        }

        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || !originalFilename.toLowerCase().endsWith(".csv")) {
            throw new IllegalArgumentException("Uploaded file must be a CSV file (.csv)");
        }

        double fileSizeMbVal = (double) file.getSize() / (1024.0 * 1024.0);
        BigDecimal fileSizeMb = BigDecimal.valueOf(fileSizeMbVal).setScale(2, RoundingMode.HALF_UP);

        // Pre-save Dataset record to generate ID
        Dataset dataset = Dataset.builder()
                .filename(originalFilename)
                .fileSizeMb(fileSizeMb)
                .status("UPLOADED")
                .uploadedAt(LocalDateTime.now())
                .recordCount(0L)
                .build();
        dataset = datasetRepository.save(dataset);

        List<Product> products = new ArrayList<>();

        try (BOMInputStream bomInputStream = BOMInputStream.builder()
                .setInputStream(file.getInputStream())
                .setInclude(false)
                .get();
             BufferedReader reader = new BufferedReader(new InputStreamReader(bomInputStream, StandardCharsets.UTF_8));
             CSVParser csvParser = CSVFormat.DEFAULT.builder()
                     .setHeader()
                     .setSkipHeaderRecord(true)
                     .setIgnoreHeaderCase(true)
                     .setTrim(true)
                     .setIgnoreEmptyLines(true)
                     .build()
                     .parse(reader)) {

            Map<String, Integer> headerMap = csvParser.getHeaderMap();
            if (headerMap == null || headerMap.isEmpty()) {
                throw new IllegalArgumentException("CSV file has no headers");
            }

            // Map standard keys to actual header names present in file
            String idHeader = findMatchingHeader(headerMap, ID_COLS);
            String titleHeader = findMatchingHeader(headerMap, TITLE_COLS);
            String descHeader = findMatchingHeader(headerMap, DESC_COLS);
            String brandHeader = findMatchingHeader(headerMap, BRAND_COLS);
            String priceHeader = findMatchingHeader(headerMap, PRICE_COLS);
            String catHeader = findMatchingHeader(headerMap, CAT_COLS);
            String sourceHeader = findMatchingHeader(headerMap, SOURCE_COLS);

            if (titleHeader == null) {
                log.warn("No recognized title column found in headers: {}. Will attempt fallback to first column.", headerMap.keySet());
            }

            long rowIndex = 0;
            for (CSVRecord record : csvParser) {
                rowIndex++;

                String title = extractValue(record, titleHeader);
                if (title == null || title.trim().isEmpty()) {
                    // Title is required; skip row if absent
                    log.warn("Skipping row {}: missing required title field", rowIndex);
                    continue;
                }

                String externalId = extractValue(record, idHeader);
                if (externalId == null || externalId.trim().isEmpty()) {
                    externalId = "ROW-" + rowIndex;
                }

                String description = extractValue(record, descHeader);
                String brand = extractValue(record, brandHeader);
                String category = extractValue(record, catHeader);
                String source = extractValue(record, sourceHeader);
                if (source == null || source.trim().isEmpty()) {
                    source = inferSourceFromFilename(originalFilename);
                }

                BigDecimal price = parsePrice(extractValue(record, priceHeader));

                Product product = Product.builder()
                        .externalId(truncate(externalId, 255))
                        .title(truncate(title, 1000))
                        .description(description)
                        .brand(truncate(brand, 255))
                        .price(price)
                        .category(truncate(category, 255))
                        .source(truncate(source, 100))
                        .datasetId(dataset.getId())
                        .createdAt(LocalDateTime.now())
                        .build();

                products.add(product);
            }

            if (!products.isEmpty()) {
                productRepository.saveAll(products);
            }

            dataset.setRecordCount((long) products.size());
            dataset = datasetRepository.save(dataset);

            log.info("Successfully ingested CSV dataset '{}' (ID: {}): {} valid products saved",
                    originalFilename, dataset.getId(), products.size());
            return dataset;

        } catch (Exception e) {
            log.error("Failed to parse and ingest CSV file '{}': {}", originalFilename, e.getMessage(), e);
            dataset.setStatus("FAILED");
            datasetRepository.save(dataset);
            throw e;
        }
    }

    private String findMatchingHeader(Map<String, Integer> headerMap, List<String> candidateNames) {
        for (String candidate : candidateNames) {
            for (String actualHeader : headerMap.keySet()) {
                if (actualHeader != null && actualHeader.trim().equalsIgnoreCase(candidate.trim())) {
                    return actualHeader;
                }
            }
        }
        return null;
    }

    private String extractValue(CSVRecord record, String headerName) {
        if (headerName == null || !record.isMapped(headerName)) {
            return null;
        }
        String val = record.get(headerName);
        return val != null ? val.trim() : null;
    }

    private BigDecimal parsePrice(String priceStr) {
        if (priceStr == null || priceStr.trim().isEmpty()) {
            return null;
        }
        try {
            // Strip any currency symbols, commas, whitespace
            String clean = priceStr.replaceAll("[^0-9.]", "").trim();
            if (clean.isEmpty()) return null;
            return new BigDecimal(clean).setScale(2, RoundingMode.HALF_UP);
        } catch (Exception e) {
            return null;
        }
    }

    private String inferSourceFromFilename(String filename) {
        if (filename == null) return "SOURCE_A";
        String lower = filename.toLowerCase();
        if (lower.contains("amazon")) return "AMAZON";
        if (lower.contains("flipkart")) return "FLIPKART";
        if (lower.contains("walmart")) return "WALMART";
        if (lower.contains("ebay")) return "EBAY";
        if (lower.contains("target")) return "TARGET";
        return "DEFAULT";
    }

    private String truncate(String val, int maxLen) {
        if (val == null) return null;
        return val.length() > maxLen ? val.substring(0, maxLen) : val;
    }
}
