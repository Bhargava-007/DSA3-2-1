package com.resolve.service.algorithm;

import com.resolve.model.Product;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;

@Slf4j
@Service
public class TokenizerService {

    private final Trie stopWordTrie = new Trie();
    private static final List<String> DEFAULT_STOP_WORDS = Arrays.asList(
        "the", "a", "an", "and", "or", "with", "for", "of", "in", "to", "by", "&",
        "pack", "set", "new", "original", "from", "at", "on", "is", "all", "official"
    );

    public TokenizerService() {
        // Pre-populate in constructor and also support lifecycle init
        init();
    }

    @PostConstruct
    public void init() {
        for (String word : DEFAULT_STOP_WORDS) {
            stopWordTrie.insert(word);
        }
        log.info("[TRIE] Pre-loaded {} stop-words into Trie for O(L) keyword filtration", DEFAULT_STOP_WORDS.size());
    }

    public static class TrieNode {
        public final Map<Character, TrieNode> children = new HashMap<>();
        public boolean isEndOfWord = false;
        public int frequency = 0;
    }

    public static class Trie {
        private final TrieNode root = new TrieNode();

        public void insert(String word) {
            if (word == null || word.isEmpty()) return;
            TrieNode current = root;
            for (char ch : word.toCharArray()) {
                current = current.children.computeIfAbsent(ch, c -> new TrieNode());
            }
            current.isEndOfWord = true;
            current.frequency++;
        }

        public boolean contains(String word) {
            if (word == null || word.isEmpty()) return false;
            TrieNode current = root;
            for (char ch : word.toCharArray()) {
                current = current.children.get(ch);
                if (current == null) return false;
            }
            return current.isEndOfWord;
        }

        public List<String> getAllWords() {
            List<String> words = new ArrayList<>();
            collectWords(root, new StringBuilder(), words);
            return words;
        }

        private void collectWords(TrieNode node, StringBuilder prefix, List<String> words) {
            if (node.isEndOfWord) {
                words.add(prefix.toString());
            }
            for (Map.Entry<Character, TrieNode> entry : node.children.entrySet()) {
                prefix.append(entry.getKey());
                collectWords(entry.getValue(), prefix, words);
                prefix.deleteCharAt(prefix.length() - 1);
            }
        }
    }

    public Trie buildTrie(Collection<String> texts) {
        Trie trie = new Trie();
        for (String text : texts) {
            List<String> tokens = tokenize(text);
            for (String token : tokens) {
                trie.insert(token);
            }
        }
        return trie;
    }

    public List<String> tokenize(String text) {
        if (text == null || text.trim().isEmpty()) {
            return Collections.emptyList();
        }

        // Clean punctuation, lowercase, split on whitespace
        String normalized = text.toLowerCase().replaceAll("[^a-z0-9\\s]", " ");
        String[] rawTokens = normalized.split("\\s+");

        List<String> result = new ArrayList<>();
        for (String token : rawTokens) {
            String trimmed = token.trim();
            if (trimmed.length() > 1 && !stopWordTrie.contains(trimmed)) {
                result.add(trimmed);
            }
        }

        return result;
    }

    public Set<String> tokenizeToSet(String text) {
        return new HashSet<>(tokenize(text));
    }

    public Map<Long, List<String>> tokenizeProducts(List<Product> products) {
        Map<Long, List<String>> map = new HashMap<>();
        if (products == null || products.isEmpty()) return map;

        log.info("[TRIE] Filtering tokens for {} products...", products.size());

        long totalTokens = 0;
        for (Product p : products) {
            List<String> tokens = tokenize(p.getTitle());
            map.put(p.getId(), tokens);
            totalTokens += tokens.size();
        }

        long avgTokens = Math.round((double) totalTokens / products.size());
        log.info("[TRIE] Tokenization complete: avg {} tokens/product", avgTokens);

        return map;
    }
}
