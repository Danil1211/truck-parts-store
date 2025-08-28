const express = require("express");
const router = express.Router();
const { Product } = require("../models/models");
const escape = require("escape-html");

/**
 * Конвертируем наш товар в XML item
 */
function productToXml(product, siteUrl) {
  const link = `${siteUrl}/product/${product._id}`;
  const img = product.images?.length ? `${siteUrl}/uploads/${product.images[0]}` : "";
  const availability =
    product.availability === "published" && product.stock > 0
      ? "in_stock"
      : "out_of_stock";

  return `
    <item>
      <g:id>${product._id}</g:id>
      <g:title>${escape(product.name || "")}</g:title>
      <g:description>${escape(product.description?.replace(/<[^>]+>/g, "").slice(0, 5000) || "")}</g:description>
      <g:link>${link}</g:link>
      ${img ? `<g:image_link>${img}</g:image_link>` : ""}
      <g:availability>${availability}</g:availability>
      <g:price>${product.price} UAH</g:price>
      ${product.charBrand ? `<g:brand>${escape(product.charBrand)}</g:brand>` : ""}
      <g:condition>${product.condition || "new"}</g:condition>
      ${product.googleCategory ? `<g:google_product_category>${escape(product.googleCategory)}</g:google_product_category>` : ""}
      ${product.mpn ? `<g:mpn>${escape(product.mpn)}</g:mpn>` : ""}
      ${product.gtin ? `<g:gtin>${escape(product.gtin)}</g:gtin>` : ""}
    </item>`;
}

/**
 * Сам фид
 */
router.get("/google.xml", async (req, res) => {
  try {
    const siteUrl = process.env.SITE_URL || "https://example.com";
    const products = await Product.find({ excludeFromFeed: { $ne: true } }).lean();

    const itemsXml = products.map((p) => productToXml(p, siteUrl)).join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>Товары магазина</title>
    <link>${siteUrl}</link>
    <description>Фид товаров для Google Merchant</description>
    ${itemsXml}
  </channel>
</rss>`;

    res.header("Content-Type", "application/xml");
    res.send(xml);
  } catch (err) {
    console.error("Feed error:", err);
    res.status(500).send("Error generating feed");
  }
});

module.exports = router;
