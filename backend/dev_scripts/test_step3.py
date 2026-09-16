import os
import time
import httpx

BASE_URL = "http://localhost:8000"
NOTEBOOK_ALPHA = "notebook_alpha_101"
NOTEBOOK_BETA = "notebook_beta_202"


def create_test_files():
    """Create sample documents for notebook isolation testing."""
    os.makedirs("test_files_step3", exist_ok=True)

    # Document 1 for Notebook Alpha (AI & Machine Learning)
    file_alpha = "test_files_step3/ai_research.txt"
    with open(file_alpha, "w", encoding="utf-8") as f:
        f.write(
            "Artificial Intelligence and Machine Learning Foundations\n\n"
            "Machine learning enables computer systems to learn patterns from historical data. "
            "Supervised learning algorithms train on labeled datasets, while unsupervised learning discovers hidden structures. "
            "Deep neural networks with transformer architectures power modern Large Language Models (LLMs) such as Gemini."
        )

    # Document 2 for Notebook Beta (Baking & Culinary Recipes)
    file_beta = "test_files_step3/baking_recipes.txt"
    with open(file_beta, "w", encoding="utf-8") as f:
        f.write(
            "Artisanal Sourdough Bread Baking Guide\n\n"
            "To bake a perfect sourdough bread, combine organic bread flour, water, salt, and active wild yeast starter. "
            "Bulk fermentation should occur at 24 degrees Celsius for 4 to 6 hours. "
            "Bake inside a preheated Dutch oven at 230°C for 20 minutes with lid on, then 20 minutes uncovered for a crispy golden crust."
        )

    return file_alpha, file_beta


def run_tests():
    print("=== Starting Step 3: Embeddings + Vector Search End-to-End Test ===")
    file_alpha, file_beta = create_test_files()
    client = httpx.Client(base_url=BASE_URL, timeout=15.0)

    # 1. Upload file into Notebook Alpha
    with open(file_alpha, "rb") as f:
        res = client.post(
            f"/api/v1/notebooks/{NOTEBOOK_ALPHA}/sources/upload",
            files={"file": (os.path.basename(file_alpha), f.read())},
        )
        assert res.status_code == 202, f"Alpha upload failed: {res.text}"
        alpha_source_id = res.json()["id"]
        print(f"Uploaded '{file_alpha}' to {NOTEBOOK_ALPHA} (Source ID: {alpha_source_id})")

    # 2. Upload file into Notebook Beta
    with open(file_beta, "rb") as f:
        res = client.post(
            f"/api/v1/notebooks/{NOTEBOOK_BETA}/sources/upload",
            files={"file": (os.path.basename(file_beta), f.read())},
        )
        assert res.status_code == 202, f"Beta upload failed: {res.text}"
        beta_source_id = res.json()["id"]
        print(f"Uploaded '{file_beta}' to {NOTEBOOK_BETA} (Source ID: {beta_source_id})")

    # Wait for background processing, chunking, and embedding generation
    print("Waiting 3 seconds for background embedding generation...")
    time.sleep(3)

    # 3. Verify chunks & embeddings exist in MongoDB via GET /api/v1/sources/{source_id}
    res = client.get(f"/api/v1/sources/{alpha_source_id}")
    assert res.status_code == 200, f"Get source detail failed: {res.text}"
    detail = res.json()
    chunks = detail["chunks"]
    print(f"Verified Source '{detail['source']['title']}': {len(chunks)} chunks created (Status: {detail['source']['status']})")
    assert len(chunks) > 0, "Expected at least 1 chunk for alpha document"

    # 4. Test Semantic Vector Search on Notebook Alpha
    search_query = "What is machine learning and neural networks?"
    print(f"\nQuerying {NOTEBOOK_ALPHA} with: '{search_query}' (top_k=5)")
    res = client.post(
        f"/api/v1/notebooks/{NOTEBOOK_ALPHA}/search",
        json={"query": search_query, "top_k": 5},
    )
    assert res.status_code == 200, f"Search failed: {res.text}"
    search_data = res.json()
    print(f"  -> Total Results Returned: {search_data['total_results']}")
    assert search_data["total_results"] > 0, "Expected search results"

    first_result = search_data["results"][0]
    print(f"  -> Top Result Source: {first_result['source_title']} (Similarity Score: {first_result['similarity_score']})")
    print(f"  -> Snippet: '{first_result['text'][:100]}...'")
    assert "Machine learning" in first_result["text"] or "neural networks" in first_result["text"]

    # 5. Test top_k constraint (top_k=1)
    res_k1 = client.post(
        f"/api/v1/notebooks/{NOTEBOOK_ALPHA}/search",
        json={"query": search_query, "top_k": 1},
    )
    assert res_k1.status_code == 200
    assert len(res_k1.json()["results"]) == 1, f"Expected exactly 1 result for top_k=1, got {len(res_k1.json()['results'])}"
    print(f"Verified top_k=1 constraint: returned exactly {len(res_k1.json()['results'])} result.")

    # 6. Test Strict Notebook Isolation (Search Notebook Alpha for baking topic)
    baking_query = "How to bake sourdough bread in a Dutch oven?"
    print(f"\nQuerying {NOTEBOOK_ALPHA} (AI Notebook) for baking query: '{baking_query}'")
    res_iso = client.post(
        f"/api/v1/notebooks/{NOTEBOOK_ALPHA}/search",
        json={"query": baking_query, "top_k": 5},
    )
    assert res_iso.status_code == 200
    iso_results = res_iso.json()["results"]
    for r in iso_results:
        assert r["notebook_id"] == NOTEBOOK_ALPHA, "Cross-notebook data leak detected!"
        assert "sourdough" not in r["text"].lower(), "Baking text leaked into AI notebook results!"
    print(f"Verified Notebook Isolation: {NOTEBOOK_ALPHA} returned 0 chunks from {NOTEBOOK_BETA}!")

    # 7. Test Empty / Non-existent Notebook query
    res_empty = client.post(
        "/api/v1/notebooks/non_existent_notebook_999/search",
        json={"query": "test query", "top_k": 5},
    )
    assert res_empty.status_code == 200
    assert res_empty.json()["total_results"] == 0
    print("Verified empty notebook search returns 0 results cleanly.")

    print("\n✅ ALL STEP 3 EMBEDDINGS & VECTOR SEARCH TESTS PASSED SUCCESSFULLY!")


if __name__ == "__main__":
    run_tests()
