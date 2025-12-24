import os
import requests
import time
import yaml
import bibtexparser
from serpapi import GoogleSearch

def _processes_author_name(name):
    split_name = name.strip().split(",")
    return split_name[1].strip() + " " + split_name[0].strip()

def convert_bib_to_yaml(bib_file, yaml_output):
    with open(bib_file, 'r', encoding='utf-8') as f:
        bib_database = bibtexparser.load(f)

    entries = []
    for entry in bib_database.entries:
        # Basic IEEE mapping
        clean_entry = {
            "title": entry.get('title', '').replace('{', '').replace('}', ''),
            "authors": list(map(_processes_author_name, entry.get('author', '').split(' and '))),
            "journal": entry.get('journal', entry.get('booktitle', '')),
            "year": entry.get('year', ''),
            "volume": entry.get('volume', ''),
            "number": entry.get('number', ''),
            "pages": entry.get('pages', ''),
            "doi": entry.get('doi', ''),
            "type": entry.get('ENTRYTYPE', 'article')
        }
        entries.append(clean_entry)

    # Sort by year descending
    entries.sort(key=lambda x: x['year'], reverse=True)

    with open(yaml_output, 'w', encoding='utf-8') as f:
        yaml.dump(entries, f, allow_unicode=True, sort_keys=False)

def get_doi_and_bibtex(title):
    """Uses Crossref to find a DOI by title and return its BibTeX."""
    # Step 1: Search Crossref for the title to get a DOI
    crossref_url = "https://api.crossref.org/works"
    params = {"query.bibliographic": title, "rows": 10}

    try:
        response = requests.get(crossref_url, params=params, timeout=10)
        if response.status_code == 200:
            items = response.json().get("message", {}).get("items", [])
            if items:
                idx = 0
                while idx < len(items) and items[idx].get("title", [''])[0] != title:
                    idx += 1
                if idx == len(items):
                    return None
                doi = items[idx].get("DOI")

                # Step 2: Get the official BibTeX for that DOI
                # Setting the Accept header to 'application/x-bibtex'
                bib_response = requests.get(
                    f"https://doi.org//{doi}",
                    headers={"Accept": "application/x-bibtex"},
                    timeout=10
                )
                if bib_response.status_code == 200:
                    return bib_response.text
    except Exception as e:
        print(f"  Error resolving {title}: {e}")
    return None

def main(author_id, bib_output_path):
    api_key = os.getenv("SERPAPI_KEY")

    articles = []
    offset = 0
    num_of_results = 100

    while True:
        search = GoogleSearch({
            "engine": "google_scholar_author",
            "author_id": author_id,
            "api_key": api_key,
            "hl": "en",
            "sort": "pubdate",
            "start": offset,
            "num": num_of_results
        })

        results = search.get_dict()
        page_articles = results.get("articles", [])
        articles = articles + page_articles

        print(f"Found {len(page_articles)} articles.")

        if len(page_articles) < num_of_results:
            break

        offset += num_of_results
        # Small delay to be polite to the API
        time.sleep(0.5)

    print(f"Found {len(articles)} articles in total. Resolving DOIs...")

    with open(bib_output_path, "w", encoding="utf-8") as f:
        for art in articles:
            title = art.get("title")
            print(f"Processing: {title}")

            bibtex = get_doi_and_bibtex(title)

            if bibtex:
                f.write(bibtex + "\n")
            else:
                continue
                # Omit publications without findable doi, if I decide to include these I should take extra care with processing in order to get the proper name format and avoid double inclusion of years
                authors = art.get("authors")
                f.write(
                    f"@inproceedings{{key_{art.get('citation_id')},\n  title = {{{title}}}, author = {{{authors}}}, booktitle = {{{art.get("publication", "N/A")}}},\n  year = {{{art.get('year')}}}\n}}\n\n")

            # Small delay to be polite to the Crossref API
            time.sleep(0.5)


if __name__ == "__main__":
    BIB_OUTPUT_PATH = "../bibliographies/me.bib"
    YAML_OUTPUT_PATH = "../data/publications/me.yaml"
    main('p8iF3LwAAAAJ', BIB_OUTPUT_PATH)
    #main('f2GfLzIAAAAJ', BIB_OUTPUT_PATH) # Šůcha
    convert_bib_to_yaml(BIB_OUTPUT_PATH, YAML_OUTPUT_PATH)
