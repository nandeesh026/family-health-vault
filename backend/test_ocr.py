from ocr_utils import extract_text_from_image, parse_values_from_text

text = extract_text_from_image("sample_report_2.png")
print("----- TEXT READ FROM IMAGE -----")
print(text)
print("----- VALUES FOUND -----")
print(parse_values_from_text(text))