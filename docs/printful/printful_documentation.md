https://developers.printful.com/docs/#tag/Errors/General-errors

https://developers.printful.com/docs/#tag/Basic-use-cases

Products API

The Products API resource lets you create, modify and delete products in a Printful store based on the Manual orders / API platform (you can create such store by going to the Stores section at your Printful dashboard.)

Important: Jewelry products are not supported via API.

To configure products and variants at a Printful store based on Shopify, WooCommerce or another supported integration platform, please see Ecommerce Platform Sync API.
To manage Warehouse products, please see Warehouse Products API.

The basics

Each product in your Printful store must contain one or multiple variants (imagine multiple sizes or colors of the same t-shirt design). Furthermore, for each variant, you have to specify both a blank product variant from our Printful Catalog and a print file. These two properties together with price and External ID (more on that later) will allow the variant to be purchasable. Please, see the following sections for more details. Finally, please note that for technical reasons a product in your Printful store is called a Sync Product and a variant of that product is called a Sync Variant. The maximum supported amount of Sync Variants a Sync Product can have is 100.

Assigning a blank product variant

Printful has a substantial catalog of blank products and variants, where each variant (e.g. size and color combination of a particular product) has a unique ID, which we call variant_id. You can browse through the catalog via Catalog API to find a specific variant_id. Moreover, when creating a Sync Product at your Printful store, each of its Sync Variants must be associated with a variant_id from the Printful Catalog. Furthermore, to assign a specific variant_id to a specific Sync Variant, simply add it to the HTTP request body (see examples at the specific endpoint).

Assigning a single print file

There are two ways to assign a print file to a Sync Variant. One is to specify the File ID if the file already exists in the File library of the authorized store;

Limitations

Important: The Products API is not intended and will never support creating and managing products in external platforms such as Shopify, WooCommerce and others. For managing your products from external platforms please refer to Ecommerce Platform Sync API

{
...
"files": [
{
"id": 12345
}
],
...
}
The second and most convenient method is to specify the file URL. If a file with the same URL already exists, it will be reused.

{
...
"files": [
{
"url": "http://example.com/t-shirts/123/front.pdf"
}
],
...
}
Moreover, each Sync Variant has to be linked with one or multiple print files. The available file types for each product are available from the Printful Catalogue API. You can add one file for each type by specifying the type attribute. For the default type, this attribute can be skipped.

...
"files":[
{
"type": "default",
"url": "http://example.com/t-shirts/123/front.pdf"
},
{
"type": "back"
"url": "http://example.com/t-shirts/123/back.pdf"
}
],
...
Remember that using additional files can increase the price of the item.

External ID

When creating a Sync Product and/or Sync Variant you can specify an External ID, which you can then use as a reference when managing or even ordering the specific Sync Product or Sync Variant. In particular, when requesting a specific Sync Product and Sync Variant, you can use either the internal Printful ID or your External ID (prefixed with an @ symbol) at the request URL.

Native inside label

Printful previously allowed customers to upload a fully customized inside label. Since these labels had to contain specific information about fabric composition, manufacturing, etc. to meet the legal requirements, users usually encountered issues to get their labels printed.

Inside labels are printed on the inside of the garment and require the removal of the original manufacturer's tag. They're only available for apparel with tear-away labels. An inside label must include the country of manufacturing origin, original garment size, and material information. To use our native label template you only need to upload a graphic (such as your brand's logo). The mandatory content will be generated and placed automatically.

...
"files":[
{
"type": "label_inside",
"url": "http://example.com/logo/123/image.jpg",
"options": [{
"id": "template_type",
"value": "native"
}]
},
],
...
Printful previously supported fully customized inside labels. These have now been deprecated. The ability to create orders with fully customized inside labels has been limited to only users who were actively using them in their stores before April 2020. This feature is no longer accessible to new users.

See examples
Get Sync Products

Returns a list of Sync Product objects from your custom Printful store.
AUTHORIZATIONS:
OAuth
QUERY PARAMETERS

status
string
Enum: "all" "synced" "unsynced" "ignored" "imported" "discontinued" "out_of_stock"
Parameter used to filter results by status/group of Sync Products
category_id
string
A comma-separated list of Category IDs of the Products that are to be returned
HEADER PARAMETERS

X-PF-Store-Id
string
Use this to specify which store you want to use (required only for account level token).

The store IDs can be retrieved with the Get basic information about stores endpoint.
Responses

200
OK
RESPONSE SCHEMA: application/json

code
integer
Response status code 200
paging
object (Paging)
Paging information
result
Array of objects (SyncProduct)
Array of SyncProduct
401
Unauthorized

GET
/store/products
Request samples

Curl

Copy
curl --location --request GET 'https://api.printful.com/store/products' \
--header 'Authorization: Bearer {oauth_token}'
Response samples

200401
Content type
application/json

Copy
Expand all Collapse all
{
"code": 200,
"paging": {
"total": 100,
"offset": 10,
"limit": 100
},
"result": [
{}
]
}
Create a new Sync Product

Creates a new Sync Product together with its Sync Variants (See examples).
AUTHORIZATIONS:
OAuth
HEADER PARAMETERS

X-PF-Store-Id
string
Use this to specify which store you want to use (required only for account level token).

The store IDs can be retrieved with the Get basic information about stores endpoint.
REQUEST BODY SCHEMA: application/json
required

POST request body
sync_product
required
object (SyncProduct)
Information about the SyncProduct
sync_variants
required
Array of objects (SyncVariant)
Information about the Sync Variants
Responses

200
OK
RESPONSE SCHEMA: application/json

code
integer
Response status code 200
result
object (SyncProduct)
Information about the SyncProduct
400
Bad Request
401
Unauthorized

POST
/store/products
Request samples

PayloadCurl
Content type
application/json

Copy
Expand all Collapse all
{
"sync_product": {
"external_id": "4235234213",
"name": "T-shirt",
"thumbnail": "​http://your-domain.com/path/to/thumbnail.png",
"is_ignored": true
},
"sync_variants": [
{}
]
}
Response samples

200400401
Content type
application/json

Copy
Expand all Collapse all
{
"code": 200,
"result": {
"id": 13,
"external_id": "4235234213",
"name": "T-shirt",
"variants": 10,
"synced": 10,
"thumbnail_url": "​https://your-domain.com/path/to/image.png",
"is_ignored": true
}
}
Get a Sync Product

Get information about a single Sync Product and its Sync Variants.
AUTHORIZATIONS:
OAuth
PATH PARAMETERS

id
required
integer or string
Sync Product ID (integer) or External ID (if prefixed with @)
HEADER PARAMETERS

X-PF-Store-Id
string
Use this to specify which store you want to use (required only for account level token).

The store IDs can be retrieved with the Get basic information about stores endpoint.
Responses

200
OK
RESPONSE SCHEMA: application/json

code
integer
Response status code 200
result
object (SyncProductInfo)
401
Unauthorized
404
Not found

GET
/store/products/{id}
Request samples

Curl

Copy
curl --location --request GET 'https://api.printful.com/store/products/{sync_product_id}' \
--header 'Authorization: Bearer {oauth_token}'
Response samples

200401404
Content type
application/json

Copy
Expand all Collapse all
{
"code": 200,
"result": {
"sync_product": {},
"sync_variants": []
}
}
Delete a Sync Product

Deletes a Sync Product with all of its Sync Variants
AUTHORIZATIONS:
OAuth
PATH PARAMETERS

id
required
integer or string
Sync Product ID (integer) or External ID (if prefixed with @)
HEADER PARAMETERS

X-PF-Store-Id
string
Use this to specify which store you want to use (required only for account level token).

The store IDs can be retrieved with the Get basic information about stores endpoint.
Responses

200
OK
RESPONSE SCHEMA: application/json

code
integer
Response status code 200
result
object (SyncProductInfo)
401
Unauthorized
404
Not found

DELETE
/store/products/{id}
Request samples

Curl

Copy
curl --location --request DELETE 'https://api.printful.com/store/products/161636638' \
--header 'Authorization: Bearer {oauth_token}'
Response samples

200401404
Content type
application/json

Copy
Expand all Collapse all
{
"code": 200,
"result": {
"sync_product": {},
"sync_variants": []
}
}
Modify a Sync Product

Modifies an existing Sync Product with its Sync Variants.

Please note that in the request body you only need to specify the fields that need to be changed. Furthermore, if you want to update existing sync variants, then in the sync variants array you must specify the IDs of all existing sync variants. All omitted existing sync variants will be deleted. All new sync variants without an ID will be created. See examples for more insights.

Rate limiting: Up to 10 requests per 60 seconds. A 60 seconds lockout is applied if request count is exceeded.

See examples
AUTHORIZATIONS:
OAuth
PATH PARAMETERS

id
required
integer or string
Sync Product ID (integer) or External ID (if prefixed with @)
HEADER PARAMETERS

X-PF-Store-Id
string
Use this to specify which store you want to use (required only for account level token).

The store IDs can be retrieved with the Get basic information about stores endpoint.
REQUEST BODY SCHEMA: application/json
required

PUT request body
sync_product
object (SyncProduct)
Information about the SyncProduct
sync_variants
Array of SyncVariant (object) or SyncVariant (object) (SyncVariant)
Information about the Sync Variants
Responses

200
OK
RESPONSE SCHEMA: application/json

code
integer
Response status code 200
result
object (SyncProduct)
Information about the SyncProduct
400
Bad Request
401
Unauthorized
404
Not found

PUT
/store/products/{id}
Request samples

Payload
Content type
application/json

Copy
Expand all Collapse all
{
"sync_product": {
"external_id": "4235234213",
"name": "T-shirt",
"thumbnail": "​http://your-domain.com/path/to/thumbnail.png",
"is_ignored": true
},
"sync_variants": [
{}
]
}
Response samples

200400401404
Content type
application/json

Copy
Expand all Collapse all
{
"code": 200,
"result": {
"id": 13,
"external_id": "4235234213",
"name": "T-shirt",
"variants": 10,
"synced": 10,
"thumbnail_url": "​https://your-domain.com/path/to/image.png",
"is_ignored": true
}
}
Get a Sync Variant

Get information about a single Sync Variant.
AUTHORIZATIONS:
OAuth
PATH PARAMETERS

id
required
integer or string
Sync Variant ID (integer) or External ID (if prefixed with @)
HEADER PARAMETERS

X-PF-Store-Id
string
Use this to specify which store you want to use (required only for account level token).

The store IDs can be retrieved with the Get basic information about stores endpoint.
Responses

200
OK
RESPONSE SCHEMA: application/json

code
integer
Response status code 200
result
object (SyncVariant)
Information about the SyncVariant
401
Unauthorized
404
Not found

GET
/store/variants/{id}
Response samples

200401404
Content type
application/json

Copy
Expand all Collapse all
{
"code": 200,
"result": {
"id": 10,
"external_id": "12312414",
"sync_product_id": 71,
"name": "Red T-Shirt",
"synced": true,
"variant_id": 3001,
"retail_price": "29.99",
"currency": "USD",
"is_ignored": true,
"sku": "SKU1234",
"product": {},
"files": [],
"options": [],
"main_category_id": 24,
"warehouse_product_id": 3002,
"warehouse_product_variant_id": 3002,
"size": "XS",
"color": "White",
"availability_status": "active"
}
}
Delete a Sync Variant

Deletes a single Sync Variant.
AUTHORIZATIONS:
OAuth
PATH PARAMETERS

id
required
integer or string
Sync Variant ID (integer) or External ID (if prefixed with @)
HEADER PARAMETERS

X-PF-Store-Id
string
Use this to specify which store you want to use (required only for account level token).

The store IDs can be retrieved with the Get basic information about stores endpoint.
Responses

200
OK
RESPONSE SCHEMA: application/json

code
integer
Response status code 200
result
Array of arrays = 0 items
401
Unauthorized
404
Not found

DELETE
/store/variants/{id}
Request samples

Curl

Copy
curl --location --request DELETE 'https://api.printful.com/store/variants/1781126754' \
--header 'Authorization: Bearer {oauth_token}'
Response samples

200401404
Content type
application/json

Copy
Expand all Collapse all
{
"code": 200,
"result": [ ]
}
Modify a Sync Variant

Modifies an existing Sync Variant.

Please note that in the request body you only need to specify the fields that need to be changed. See examples for more insights.

See examples
AUTHORIZATIONS:
OAuth
PATH PARAMETERS

id
required
integer or string
Sync Variant ID (integer) or External ID (if prefixed with @)
HEADER PARAMETERS

X-PF-Store-Id
string
Use this to specify which store you want to use (required only for account level token).

The store IDs can be retrieved with the Get basic information about stores endpoint.
REQUEST BODY SCHEMA: application/json
required

POST request body
id
integer
Sync Variant ID. Please specify the IDs of all Sync Variants you wish to keep.
external_id
string
Variant ID from the Ecommerce platform
variant_id
integer
Printful Variant ID that this Sync Variant is synced to
retail_price
string
Retail price that this item is sold for
is_ignored
boolean
Indicates if this Sync Variant is ignored
sku
string or null
SKU of this Sync Variant
files
Array of objects (SyncVariantFile)
Array of attached printfiles / preview images
options
Array of objects (SyncVariantOption)
Array of additional options for the configured product/variant See examples
availability_status
string
Enum: "active" "discontinued" "out_of_stock" "temporary_out_of_stock"
Indicates the status of the Sync Variant.
Responses

200
OK
RESPONSE SCHEMA: application/json

code
integer
Response status code 200
result
object (SyncVariant)
Information about the SyncVariant
400
Bad Request
401
Unauthorized
404
Not found

PUT
/store/variants/{id}
Request samples

PayloadCurl
Content type
application/json

Copy
Expand all Collapse all
{
"id": 10,
"external_id": "12312414",
"variant_id": 3001,
"retail_price": "29.99",
"is_ignored": true,
"sku": "SKU1234",
"files": [
{}
],
"options": [
{}
],
"availability_status": "active"
}
Response samples

200400401404
Content type
application/json

Copy
Expand all Collapse all
{
"code": 200,
"result": {
"id": 10,
"external_id": "12312414",
"sync_product_id": 71,
"name": "Red T-Shirt",
"synced": true,
"variant_id": 3001,
"retail_price": "29.99",
"currency": "USD",
"is_ignored": true,
"sku": "SKU1234",
"product": {},
"files": [],
"options": [],
"main_category_id": 24,
"warehouse_product_id": 3002,
"warehouse_product_variant_id": 3002,
"size": "XS",
"color": "White",
"availability_status": "active"
}
}
Create a new Sync Variant

Creates a new Sync Variant for an existing Sync Product (See examples).
AUTHORIZATIONS:
OAuth
PATH PARAMETERS

id
required
integer or string
Sync Product ID (integer) or External ID (if prefixed with @)
HEADER PARAMETERS

X-PF-Store-Id
string
Use this to specify which store you want to use (required only for account level token).

The store IDs can be retrieved with the Get basic information about stores endpoint.
REQUEST BODY SCHEMA: application/json
required

POST request body
external_id
string
Variant ID from the Ecommerce platform
variant_id
required
integer
Printful Variant ID that this Sync Variant is synced to
retail_price
string
Retail price that this item is sold for
is_ignored
boolean
Indicates if this Sync Variant is ignored
sku
string or null
SKU of this Sync Variant
files
required
Array of objects (SyncVariantFile)
Array of attached printfiles / preview images
options
Array of objects (SyncVariantOption)
Array of additional options for the configured product/variant See examples
availability_status
string
Enum: "active" "discontinued" "out_of_stock" "temporary_out_of_stock"
Indicates the status of the Sync Variant.
Responses

200
OK
RESPONSE SCHEMA: application/json

code
integer
Response status code 200
result
object (SyncVariant)
Information about the SyncVariant
400
Bad Request
401
Unauthorized
404
Not found

POST
/store/products/{id}/variants
Request samples

PayloadCurl
Content type
application/json

Copy
Expand all Collapse all
{
"external_id": "12312414",
"variant_id": 3001,
"retail_price": "29.99",
"is_ignored": true,
"sku": "SKU1234",
"files": [
{}
],
"options": [
{}
],
"availability_status": "active"
}
Response samples

200400401404
Content type
application/json

Copy
Expand all Collapse all
{
"code": 200,
"result": {
"id": 10,
"external_id": "12312414",
"sync_product_id": 71,
"name": "Red T-Shirt",
"synced": true,
"variant_id": 3001,
"retail_price": "29.99",
"currency": "USD",
"is_ignored": true,
"sku": "SKU1234",
"product": {},
"files": [],
"options": [],
"main_category_id": 24,
"warehouse_product_id": 3002,
"warehouse_product_variant_id": 3002,
"size": "XS",
"color": "White",
"availability_status": "active"
}
}
Product Templates API

The Product Templates API resource lets you retrieve the product templates information.

External Product ID

In case of a single template retrieval it is possible to get it by the External Product ID. In order to do this, the ID needs to be prepended with the '@' character. Here are the examples of how to get the template data by the Template ID and by the External Product ID.

GET /product-templates/11001  - reference by Printful Template ID
GET /product-templates/@988123  - reference by External ID
See examples
Get product template list

Returns a list of templates.
AUTHORIZATIONS:
OAuth
QUERY PARAMETERS

offset
integer
Result set offset
limit
integer
Number of items per page (max 100)
Responses

200
OK
RESPONSE SCHEMA: application/json

code
integer
Response status code 200
result
object (Product template)
Information about the template
paging
object (Paging)
Paging information
401
Unauthorized

GET
/product-templates
Request samples

Curl

Copy
curl --location --request GET 'https://api.printful.com/product-templates' \
--header 'Authorization: Bearer {oauth_token}'
Response samples

200401
Content type
application/json

Copy
Expand all Collapse all
{
"code": 200,
"result": {
"items": []
},
"paging": {
"total": 100,
"offset": 10,
"limit": 100
}
}
Get product template

Get information about a single product template
AUTHORIZATIONS:
OAuth
PATH PARAMETERS

id
required
integer or string
Template ID (integer) or External Product ID (if prefixed with @)
Responses

200
OK
RESPONSE SCHEMA: application/json

code
integer
Response status code 200
result
object (Product template)
Information about the template
401
Unauthorized

GET
/product-templates/{id}
Request samples

Curl

Copy
curl --location --request GET 'https://api.printful.com/product-templates/{template_id}' \
--header 'Authorization: Bearer {oauth_token}'
Response samples

200401
Content type
application/json

Copy
Expand all Collapse all
{
"code": 200,
"result": {
"id": 0,
"product_id": 0,
"external_product_id": "string",
"title": "string",
"available_variant_ids": [],
"option_data": [],
"colors": [],
"sizes": [],
"mockup_file_url": "string",
"placements": [],
"created_at": 0,
"updated_at": 0,
"placement_option_data": []
}
}
Delete product template

Delete product template by ID or External Product ID
AUTHORIZATIONS:
OAuth
PATH PARAMETERS

id
required
integer or string
Template ID (integer) or External Product ID (if prefixed with @)
Responses

200
OK
RESPONSE SCHEMA: application/json

code
integer
Response status code 200
result
object
401
Unauthorized

DELETE
/product-templates/{id}
Request samples

Curl

Copy
curl --location --request DELETE 'https://api.printful.com/product-templates/{template_id}' \
--header 'Authorization: Bearer {oauth_token}'
Response samples

200401
Content type
application/json

Copy
Expand all Collapse all
{
"code": 200,
"result": {
"success": true
}
}
Orders API

The Orders API is the most important part of the Printful API - it allows you to create new orders and confirm them for fulfillment.

Important: Jewelry products are not supported via API.

Order life cycle and statuses

Each order will go through different states while being processed. The following order status types indicate those states:

draft	The order is created but is not yet submitted for fulfillment. You still can edit it and confirm later.
inreview	The order is being reviewed. It's not possible to cancel the order at this point. It will be possible to cancel the order when the review process is finished.
pending	The order has been submitted for fulfillment, but is not yet accepted for fulfillment. You can still cancel the order if you need.
failed	Order was submitted for fulfillment but was returned for review because of an error (problem with address, missing printfiles, charging has failed, etc.).
canceled	The order has been canceled and can no longer be processed. If the order was charged then the amount has been returned to your credit card.
inprocess	The order is being fulfilled and can no longer be cancelled or modified. Contact customer support if there are any issues with the order at this point.
onhold	The order has encountered a problem during the fulfillment that needs to be resolved together with Printful customer service before fulfillment can continue.
partial	The order is partially fulfilled (some items are shipped already, the rest will follow)
fulfilled	All items have been shipped successfully
archived	The order has been archived and hidden from the UI
To sum up, the API allows you to create orders with status draft and then move them to state pending (both steps can be done with a single action). You are only charged for orders that have been confirmed. If the order encounters a problem after it has been submitted, then it is moved to the failed state so that the problem can be fixed and the order can be resubmitted.

Asynchronous order cost calculation

Most of the times, when you submit an order, we'll perform the cost calculation and return it in the response.

However, we might not be able to calculate all the costs immediately, for example if the order contains a new advanced embroidery design. If that's the case, we'll automatically put your order on hold, calculate the order costs once it's possible, and then remove the order from hold.

Such an order will return to a draft status (even if it was created with the auto-confirm option) and will need to be confirmed.

You can subscribe to the order_remove_hold event (see Webhook API) to be notified when the order is removed from hold.

External ID

External ID is an optional feature that allows you to link your Printful order with the Order ID from your system without the need to store additional data on your side. External ID can be up to 32 characters long and contain digits, Latin alphabet letters, dashes and underscores, however it is recommended to use integer numbers. Each order's External ID must be unique within the store.

To use the External ID feature, you just add the external_id attribute when creating the order. Later, when you need to access the order through the API, you can reference it by both the Order ID and by External ID (if you prefix it with the @ symbol).

GET /orders/11001  - reference by Printful Order ID
GET /orders/@988123  - reference by External ID
GET /orders/@AA123123  - reference by External ID
You can assign the external_id attribute to line items as well. In this case they have to be unique per order.

Specifying products

There are three general ways to specify a product’s variant when creating, updating or estimating an order:

(A) Using an existing product variant (sync variant) in your Printful store or warehouse. To specify the existing product please use its sync_variant_id or external_variant_id, or warehouse_product_variant_id.

Example using Sync Variant ID Example using External Variant ID

(B) Using a Catalog API variant without adding a product to the store. This method can be used when a Printful store has no products in it. To construct a variant on-the-fly retrieve a specific variant_id from the Catalog API together with print files and an additional options.

Example

(C) Using an existing template ID. This method can be used when a Printful store has assigned templates without the need to create products. To create an order please use the product_template_id and variant_id that will be added to the order.

Example

Adding print files

There are two ways to assign a print file to the item. One is to specify the File ID if the file already exists in the file library of the authorized store:

...
"files": [
{
"id": 12345
},
],
...
The second and the most convenient method is to specify the file URL. If a file with the same URL already exists, it will be reused.

...
"files": [
{
"url": "http://example.com/t-shirts/123/front.pdf"
},
],
...
Specifying file position

You can specify the image position inside the print area by providing a position object.

Important

Each print area has specific dimensions, by default Orders API will assume that your file has to stick to those limitations and not exceed them. In some cases you would want to position your file outside the print area - to be able to do so use the limit_to_print_area and set it to: false.
limit_to_print_area determines if the image can cross the print area border. If limit_to_print_area is set to true then the request will result in 400 Bad Request with "Invalid position" in error.message once the image crosses the print area borders. If limit_to_print_area is set to false then it will be possible to place image partially or fully outside the print area.
The (0,0) point is always located in top left corner of the print area.
Steps
1.Retrieve printfile dimensions Printfiles

...
"printfiles":
[
{
"printfile_id": 1,
"width": 1800,
"height": 2400,
"dpi": 150,
"fill_mode": "fit",
"can_rotate": false
}
],
...
2.Specify file position for specific print placement while creating an order. Use items -> files -> position object as in the example:

...
"items": [
{
"variant_id":4011,
"quantity":"1",
"files": [
{
"type": "front",
"url": "http://example.com/t-shirts/123/front.pdf",
"position": {
"area_width": 1800,
"area_height": 2400,
"width": 1800,
"height": 1800,
"top": 300,
"left": 0,
"limit_to_print_area": true
}
}
]
}
]
...
Example of positioning the 450x450 image on the front placement

Position	Mockup	Payload
Top left	Top left mockup
"position": {
"area_width": 1800,
"area_height": 2400,
"width": 450,
"height": 450,
"top": 0,
"left": 0,
"limit_to_print_area": true
}
Top middle	Top left mockup
"position": {
"area_width": 1800,
"area_height": 2400,
"width": 450,
"height": 450,
"top": 0,
"left": 675,
"limit_to_print_area": true
}
Top right	Top left mockup
"position": {
"area_width": 1800,
"area_height": 2400,
"width": 450,
"height": 450,
"top": 0,
"left": 1350,
"limit_to_print_area": true
}
Middle	Top left mockup
"position": {
"area_width": 1800,
"area_height": 2400,
"width": 450,
"height": 450,
"top": 975,
"left": 675,
"limit_to_print_area": true
}
Bottom left	Top left mockup
"position": {
"area_width": 1800,
"area_height": 2400,
"width": 450,
"height": 450,
"top": 1950,
"left": 0,
"limit_to_print_area": true
}
Bottom middle	Top left mockup
"position": {
"area_width": 1800,
"area_height": 2400,
"width": 450,
"height": 450,
"top": 1950,
"left": 675,
"limit_to_print_area": true
}
Bottom right	Top left mockup
"position": {
"area_width": 1800,
"area_height": 2400,
"width": 450,
"height": 450,
"top": 1950,
"left": 1350,
"limit_to_print_area": true
}
Specifying multiple files per item

Each item in the order has to be linked with one or multiple files. The available file types for each product are available from the Catalog API.

You can add one file for each type by specifying the type attribute. For the default type, this attribute can be skipped.

...
"files":[
{
"type": "default",
"url": "http://example.com/t-shirts/123/front.pdf"
},
{
"type": "back"
"url": "http://example.com/t-shirts/123/back.pdf"
},
{
"type": "preview"
"url": "http://example.com/t-shirts/123/preview.png"
}
],
...
Remember that using additional files can increase the price of the item.

Creating orders from a template

Orders API allows also creating orders based on the product template created in the Printful account without the need to add the product to the Printful store.

To retrieve available templates for your account please use the Products Templates API.

To create an order from a template you need to specify a variant or variants that will be added to the order. It is possible to use multiple templates with different variants in one request. To achieve that please use the items object below:

    ...
    "items": [
        {
            "variant_id": 4012,
            "quantity": 1,
            "product_template_id": 123456789
        },
        {
            "variant_id": 1,
            "quantity": 2,
            "product_template_id": 11235813
        },
    ]
    ...
Important note: you can only create orders from templates for variant IDs from the Catalog API.

More examples are available here.

Retail costs

Printful allows you to specify your retail costs for the order so that the packing slip for international orders can contain your correct retail prices. To enable retail costs, each item in the order has to contain the retail_price attribute. You can also specify a custom discount sum, shipping costs and taxes in the retail_costs object when creating the order. If the retail costs are missing, the packing slip will contain the Printful prices instead.

Native inside label

Printful previously allowed customers to upload a fully customized inside label. Since these labels had to contain specific information about fabric composition, manufacturing, etc. to meet the legal requirements, users usually encountered issues to get their labels printed.

Inside labels are printed on the inside of the garment and require the removal of the original manufacturer's tag. They're only available for apparel with tear-away labels. An inside label must include the country of manufacturing origin, original garment size, and material information. To use our native label template you only need to upload a graphic (such as your brand's logo). The mandatory content will be generated and placed automatically.

...
"files":[
{
"type": "label_inside",
"url": "http://example.com/logo/123/image.jpg",
"options": [{
"id": "template_type",
"value": "native"
}]
},
],
...
Printful previously supported fully customized inside labels. These have now been deprecated. The ability to create orders with fully customized inside labels has been limited to only users who were actively using them in their stores before April 2020. This feature is no longer accessible to new users.

Ordering embroidery products

Embroidery is a technique which uses colored threads, sewn into a product, to recreate provided design. In order to use embroidery technique you first need to check if selected product support embroidery technique.

In order to do that you need to use Catalog API to determine if the selected product or variant contains EMBROIDERY technique.

"techniques": [
{
"key": "EMBROIDERY",
"display_name": "Embroidery",
"is_default": true
}
]
After that you need to also get list of available embroidery placements. Those are listed under file property with embroidery_ prefix. You can get list of all available placements in Placements.

Example of file property
To create an order using embroidery technique you can:

Provide thread colors manually See example
Use automatic thread color detection See example
Finally, you can make an order using embroidery technique See example. Depending on the placement that you've used you need to specify the correct thread color option.

Packing slip

The packing slip fields can be configured at the store level and overridden for a specific order.

The packing slip settings can be found in Dashboard at Settings > Stores > Branding > Packing slip section.

To override the packing slip settings for the order, you can use packing_slip or gift fields.

Below you can find an example or a packing slip for a shipment with explained fields.

packing slip

Field annotations:

(1) Barcode unique for the shipment.
(2) Store logo defined in the store settings or overridden using packing_slip.logo_url field. The provided image is converted to a grayscale/1-bit monochrome image.
(3) The date of the shipment.
(4) Packing slip number consisting of order and shipment IDs in Printful database, divided with a hyphen.
(5) The country from which the shipment is made. If the recipient is in the United States, this field will be absent.
(6) Recipient address with phone, without email address.
(7) Store name. This can be overridden using packing_slip.store_name.
(8) The address to which the shipment should be returned. By default it will be a Printful’s return address, but you can set your own address in the store settings (Settings > Stores > Returns > Return address section).
(9) The customer service phone number defined in the store settings or overridden using packing_slip.phone field.
(10) The customer service email address defined in the store settings or overridden using packing_slip.email field.
(11) Gift message. This is only present if the gift field was provided in the order request.
(12) The order creation date.
(13) Printful Order ID which can be overridden using packing_slip.custom_order_id field.
(14) The list of order items with quantities. The items’ display names are localized, using the recipient’s country and include variant information such as color and size e.g. „Unisex Staple T-Shirt | Bella + Canvas 3001 ( Lilac / M)”.
(15) The packing slip message defined in the store settings or overridden using packing_slip.message field.
More Orders API examples

See the examples section for more sample requests on how Orders API can be used in different scenarios.

Custom border color option

Stickers can have a different border color which can be set by using the thread_colors_outline option. This option is available in options for stickers. To showcase the usage we will use the order flow which will create order with a sticker that will have a red border color:

Endpoint POST https://api.printful.com/orders

Request body
Get list of orders

Returns list of order objects from your store
AUTHORIZATIONS:
OAuth
QUERY PARAMETERS

status
string
Filter by order status
offset
integer
Result set offset
limit
integer
Number of items per page (max 100)
Responses

200
OK
RESPONSE SCHEMA: application/json

code
integer
Response status code 200
paging
object (Paging)
Paging information
result
Array of objects (Order)
401
Unauthorized

GET
/orders
Request samples

Curl

Copy
curl --location --request GET 'https://api.printful.com/orders' \
--header 'Authorization: Bearer {oauth_token}'
Response samples

200401
Content type
application/json

Copy
Expand all Collapse all
{
"code": 200,
"paging": {
"total": 100,
"offset": 10,
"limit": 100
},
"result": [
{}
]
}
Create a new order

Creates a new order and optionally submits it for fulfillment (See examples)
AUTHORIZATIONS:
OAuth
QUERY PARAMETERS

confirm
boolean
Automatically submit the newly created order for fulfillment (skip the Draft phase)
update_existing
boolean
Try to update existing order if an order with the specified external_id already exists
HEADER PARAMETERS

X-PF-Store-Id
string
Use this to specify which store you want to use (required only for account level token).

The store IDs can be retrieved with the Get basic information about stores endpoint.
REQUEST BODY SCHEMA: application/json
required

POST request body
external_id
string or null
Order ID from the external system
shipping
string
Shipping method. Defaults to 'STANDARD'
recipient
required
object (Address)
Information about the address
items
required
Array of Item (object) or Item (object) or Item (object) or Item (object) or Item (object) or Item (object) (Item)
Array of items in the order
retail_costs
object (OrderRetailCosts)
Retail costs that are to be displayed on the packing slip for international shipments. Retail costs are used only if every item in order contains the retail_price attribute.
gift
object (OrderGift)
Optional gift message for the packing slip
packing_slip
OrderPackingSlip (object) or OrderPackingSlip (object) or OrderPackingSlip (object) or OrderPackingSlip (object) (OrderPackingSlip)
Custom packing slip for this order. Example of a packing slip with explained fields can be found here.
Responses

200
OK
RESPONSE SCHEMA: application/json

code
integer
Response status code 200
result
object (Order)
Information about the Order
400
Bad Request
401
Unauthorized

POST
/orders
Request samples

Payload
Content type
application/json

Copy
Expand all Collapse all
{
"external_id": "4235234213",
"shipping": "STANDARD",
"recipient": {
"name": "John Smith",
"company": "John Smith Inc",
"address1": "19749 Dearborn St",
"address2": "string",
"city": "Chatsworth",
"state_code": "CA",
"state_name": "California",
"country_code": "US",
"country_name": "United States",
"zip": "91311",
"phone": "2312322334",
"email": "firstname.secondname@domain.com",
"tax_number": "123.456.789-10"
},
"items": [
{}
],
"retail_costs": {
"currency": "USD",
"subtotal": "10.00",
"discount": "0.00",
"shipping": "5.00",
"tax": "0.00"
},
"gift": {
"subject": "To John",
"message": "Have a nice day"
},
"packing_slip": {
"email": "your-name@your-domain.com",
"phone": "+371 28888888",
"message": "Message on packing slip",
"logo_url": "​http://www.your-domain.com/packing-logo.png",
"store_name": "Your store name",
"custom_order_id": "kkk2344lm"
}
}
Response samples

200400401
Content type
application/json

Copy
Expand all Collapse all
{
"code": 200,
"result": {
"id": 13,
"external_id": "4235234213",
"store": 10,
"status": "draft",
"shipping": "STANDARD",
"shipping_service_name": "Flat Rate (3-4 business days after fulfillment)",
"created": 1602607640,
"updated": 1602607640,
"recipient": {},
"items": [],
"branding_items": [],
"incomplete_items": [],
"costs": {},
"retail_costs": {},
"pricing_breakdown": [],
"shipments": [],
"gift": {},
"packing_slip": {}
}
}
Get order data

Returns order data by ID or External ID.
AUTHORIZATIONS:
OAuth
PATH PARAMETERS

id
required
string or integer
Order ID (integer) or External ID (if prefixed with @)
HEADER PARAMETERS

X-PF-Store-Id
string
Use this to specify which store you want to use (required only for account level token).

The store IDs can be retrieved with the Get basic information about stores endpoint.
Responses

200
OK
RESPONSE SCHEMA: application/json

code
integer
Response status code 200
result
object (Order)
Information about the Order
401
Unauthorized
404
Not found

GET
/orders/{id}
Request samples

Curl

Copy
curl --location --request GET 'https://api.printful.com/orders/{order_id}' \
--header 'Authorization: Bearer {oauth_token}'
Response samples

200401404
Content type
application/json

Copy
Expand all Collapse all
{
"code": 200,
"result": {
"id": 13,
"external_id": "4235234213",
"store": 10,
"status": "draft",
"shipping": "STANDARD",
"shipping_service_name": "Flat Rate (3-4 business days after fulfillment)",
"created": 1602607640,
"updated": 1602607640,
"recipient": {},
"items": [],
"branding_items": [],
"incomplete_items": [],
"costs": {},
"retail_costs": {},
"pricing_breakdown": [],
"shipments": [],
"gift": {},
"packing_slip": {}
}
}
Cancel an order

Cancels pending order or draft. Charged amount is returned to the store owner's credit card.
AUTHORIZATIONS:
OAuth
PATH PARAMETERS

id
required
string or integer
Order ID (integer) or External ID (if prefixed with @)
HEADER PARAMETERS

X-PF-Store-Id
string
Use this to specify which store you want to use (required only for account level token).

The store IDs can be retrieved with the Get basic information about stores endpoint.
Responses

200
OK
RESPONSE SCHEMA: application/json

code
integer
Response status code 200
result
object (Order)
Information about the Order
401
Unauthorized
404
Not found

DELETE
/orders/{id}
Request samples

Curl

Copy
curl --location --request DELETE 'https://api.printful.com/orders/{order_id}' \
--header 'Authorization: Bearer {oauth_token}'
Response samples

200401404
Content type
application/json

Copy
Expand all Collapse all
{
"code": 200,
"result": {
"id": 13,
"external_id": "4235234213",
"store": 10,
"status": "draft",
"shipping": "STANDARD",
"shipping_service_name": "Flat Rate (3-4 business days after fulfillment)",
"created": 1602607640,
"updated": 1602607640,
"recipient": {},
"items": [],
"branding_items": [],
"incomplete_items": [],
"costs": {},
"retail_costs": {},
"pricing_breakdown": [],
"shipments": [],
"gift": {},
"packing_slip": {}
}
}
Update order data

Updates unsubmitted order and optionally submits it for the fulfillment.

Note that you need to post only the fields that need to be changed, not all required fields.

If items array is given in the update data, the items will be:

a) updated, if the update data contains the item id or external_id parameter that alreay exists

b) deleted, if the request doesn't contain the item with previously existing id

c) created as new if the id is not given or does not already exist
AUTHORIZATIONS:
OAuth
PATH PARAMETERS

id
required
string or integer
Order ID (integer) or External ID (if prefixed with @)
QUERY PARAMETERS

confirm
boolean
Automatically submit the newly created order for fulfillment (skip the Draft phase)
HEADER PARAMETERS

X-PF-Store-Id
string
Use this to specify which store you want to use (required only for account level token).

The store IDs can be retrieved with the Get basic information about stores endpoint.
REQUEST BODY SCHEMA: application/json
required

POST request body
external_id
string or null
Order ID from the external system
shipping
string
Shipping method. Defaults to 'STANDARD'
recipient
required
object (Address)
Information about the address
items
required
Array of Item (object) or Item (object) or Item (object) or Item (object) or Item (object) or Item (object) (Item)
Array of items in the order
retail_costs
object (OrderRetailCosts)
Retail costs that are to be displayed on the packing slip for international shipments. Retail costs are used only if every item in order contains the retail_price attribute.
gift
object (OrderGift)
Optional gift message for the packing slip
packing_slip
OrderPackingSlip (object) or OrderPackingSlip (object) or OrderPackingSlip (object) or OrderPackingSlip (object) (OrderPackingSlip)
Custom packing slip for this order. Example of a packing slip with explained fields can be found here.
Responses

200
OK
RESPONSE SCHEMA: application/json

code
integer
Response status code 200
result
object (Order)
Information about the Order
400
Bad Request
401
Unauthorized
404
Not found

PUT
/orders/{id}
Request samples

Payload
Content type
application/json

Copy
Expand all Collapse all
{
"external_id": "4235234213",
"shipping": "STANDARD",
"recipient": {
"name": "John Smith",
"company": "John Smith Inc",
"address1": "19749 Dearborn St",
"address2": "string",
"city": "Chatsworth",
"state_code": "CA",
"state_name": "California",
"country_code": "US",
"country_name": "United States",
"zip": "91311",
"phone": "2312322334",
"email": "firstname.secondname@domain.com",
"tax_number": "123.456.789-10"
},
"items": [
{}
],
"retail_costs": {
"currency": "USD",
"subtotal": "10.00",
"discount": "0.00",
"shipping": "5.00",
"tax": "0.00"
},
"gift": {
"subject": "To John",
"message": "Have a nice day"
},
"packing_slip": {
"email": "your-name@your-domain.com",
"phone": "+371 28888888",
"message": "Message on packing slip",
"logo_url": "​http://www.your-domain.com/packing-logo.png",
"store_name": "Your store name",
"custom_order_id": "kkk2344lm"
}
}
Response samples

200400401404
Content type
application/json

Copy
Expand all Collapse all
{
"code": 200,
"result": {
"id": 13,
"external_id": "4235234213",
"store": 10,
"status": "draft",
"shipping": "STANDARD",
"shipping_service_name": "Flat Rate (3-4 business days after fulfillment)",
"created": 1602607640,
"updated": 1602607640,
"recipient": {},
"items": [],
"branding_items": [],
"incomplete_items": [],
"costs": {},
"retail_costs": {},
"pricing_breakdown": [],
"shipments": [],
"gift": {},
"packing_slip": {}
}
}
Confirm draft for fulfillment

Approves for fulfillment an order that was saved as a draft. Store owner's credit card is charged when the order is submitted for fulfillment.
AUTHORIZATIONS:
OAuth
PATH PARAMETERS

id
required
string or integer
Order ID (integer) or External ID (if prefixed with @)
HEADER PARAMETERS

X-PF-Store-Id
string
Use this to specify which store you want to use (required only for account level token).

The store IDs can be retrieved with the Get basic information about stores endpoint.
Responses

200
OK
RESPONSE SCHEMA: application/json

code
integer
Response status code 200
result
object (Order)
Information about the Order
401
Unauthorized
404
Not found

POST
/orders/{id}/confirm
Request samples

Curl

Copy
curl --location --request POST 'https://api.printful.com/orders/{order_id}/confirm' \
--header 'Authorization: Bearer {oauth_token}'
Response samples

200401404
Content type
application/json

Copy
Expand all Collapse all
{
"code": 200,
"result": {
"id": 13,
"external_id": "4235234213",
"store": 10,
"status": "draft",
"shipping": "STANDARD",
"shipping_service_name": "Flat Rate (3-4 business days after fulfillment)",
"created": 1602607640,
"updated": 1602607640,
"recipient": {},
"items": [],
"branding_items": [],
"incomplete_items": [],
"costs": {},
"retail_costs": {},
"pricing_breakdown": [],
"shipments": [],
"gift": {},
"packing_slip": {}
}
}
Estimate order costs

Calculates the estimated order costs including item costs, print costs (back prints, inside labels etc.), shipping and taxes
AUTHORIZATIONS:
OAuth
HEADER PARAMETERS

X-PF-Store-Id
string
Use this to specify which store you want to use (required only for account level token).

The store IDs can be retrieved with the Get basic information about stores endpoint.
REQUEST BODY SCHEMA: application/json
required

POST request body
external_id
string or null
Order ID from the external system
shipping
string
Shipping method. Defaults to 'STANDARD'
recipient
required
object (Address)
Information about the address
items
required
Array of Item (object) or Item (object) or Item (object) or Item (object) or Item (object) or Item (object) (Item)
Array of items in the order
retail_costs
object (OrderRetailCosts)
Retail costs that are to be displayed on the packing slip for international shipments. Retail costs are used only if every item in order contains the retail_price attribute.
gift
object (OrderGift)
Optional gift message for the packing slip
packing_slip
OrderPackingSlip (object) or OrderPackingSlip (object) or OrderPackingSlip (object) or OrderPackingSlip (object) (OrderPackingSlip)
Custom packing slip for this order. Example of a packing slip with explained fields can be found here.
Responses

200
OK
RESPONSE SCHEMA: application/json

code
integer
Response status code 200
result
object
400
Bad Request
401
Unauthorized

POST
/orders/estimate-costs
Request samples

PayloadCurl
Content type
application/json

Copy
Expand all Collapse all
{
"external_id": "4235234213",
"shipping": "STANDARD",
"recipient": {
"name": "John Smith",
"company": "John Smith Inc",
"address1": "19749 Dearborn St",
"address2": "string",
"city": "Chatsworth",
"state_code": "CA",
"state_name": "California",
"country_code": "US",
"country_name": "United States",
"zip": "91311",
"phone": "2312322334",
"email": "firstname.secondname@domain.com",
"tax_number": "123.456.789-10"
},
"items": [
{}
],
"retail_costs": {
"currency": "USD",
"subtotal": "10.00",
"discount": "0.00",
"shipping": "5.00",
"tax": "0.00"
},
"gift": {
"subject": "To John",
"message": "Have a nice day"
},
"packing_slip": {
"email": "your-name@your-domain.com",
"phone": "+371 28888888",
"message": "Message on packing slip",
"logo_url": "​http://www.your-domain.com/packing-logo.png",
"store_name": "Your store name",
"custom_order_id": "kkk2344lm"
}
}
Response samples

200400401
Content type
application/json

Copy
Expand all Collapse all
{
"code": 200,
"result": {
"costs": {},
"retail_costs": {}
}
}
File Library API

To avoid the need to upload every file again when the same item is ordered, your print files are stored in the File Library and can be reused.

You can use this API to directly add files to the library, and later use File IDs when creating orders. However, the more convenient way is to specify the files by URL at the same time the order is created.

Most probably you will never need to use this API - just specify the file URL when creating orders and the files will be added automatically.
File processing can be very time-consuming, so they are processed asynchronously. After you add a file, it is saved with the status waiting and downloaded and processed later. Afterward, the status is changed to ok if the file was loaded successfully and was a valid image file or failed if the process did not succeed. Some file metadata fields like dimensions and resolution are only filled in after the file has been processed.

If an order with a file has been confirmed before the file was processed, and the file turns out to be invalid, then the order is reverted to a failed state and needs to be corrected and confirmed again.

If you try to add a file that has an identical URL to an already existing file, then no new file is created, and the system returns the old one without refreshing its contents.

Remember
If you have changed the original, make sure that the URL is changed as well for future orders, otherwise the old version will be reused.
You can add a “last modified” timestamp to the end of the URL to ensure that the URL is different for changed files.

Files that are added through the API can be set not to show up in the File library on the web, just set the visible attribute to false when creating them.

Caution: API endpoint "Get list of files" (/files) is removed and can no longer be used. Calling this endpoint will return a HTTP 410 (Gone) response.
Add a new file

Adds a new File to the library by providing URL of the file.

If a file with identical URL already exists, then the original file is returned. If a file does not exist, a new file is created.

See examples
AUTHORIZATIONS:
OAuth
HEADER PARAMETERS

X-PF-Store-Id
string
Use this to specify which store you want to use (required only for account level token).

The store IDs can be retrieved with the Get basic information about stores endpoint.
REQUEST BODY SCHEMA: application/json
required

POST request body
type
string
Role of the file
url
required
string
Source URL where the file is downloaded from. The use of .ai .psd and .tiff files have been depreciated, if your application uses these file types or accepts these types from users you will need to add validation.
options
Array of objects (FileOption)
Array of additional options for this file See examples
filename
string
File name
visible
boolean
Show file in the Printfile Library (default true)
Responses

200
OK
RESPONSE SCHEMA: application/json

code
integer
Response status code 200
result
object (File)
Information about the File
400
Bad Request
401
Unauthorized

POST
/files
Request samples

PayloadCurl
Content type
application/json

Copy
Expand all Collapse all
{
"type": "default",
"url": "​https://www.example.com/files/tshirts/example.png",
"options": [
{}
],
"filename": "shirt1.png",
"visible": true
}
Response samples

200400401
Content type
application/json

Copy
Expand all Collapse all
{
"code": 200,
"result": {
"type": "default",
"id": 10,
"url": "​https://www.example.com/files/tshirts/example.png",
"options": [],
"hash": "ea44330b887dfec278dbc4626a759547",
"filename": "shirt1.png",
"mime_type": "image/png",
"size": 45582633,
"width": 1000,
"height": 1000,
"dpi": 300,
"status": "ok",
"created": 1590051937,
"thumbnail_url": "https://files.cdn.printful.com/files/ea4/ea44330b887dfec278dbc4626a759547_thumb.png",
"preview_url": "https://files.cdn.printful.com/files/ea4/ea44330b887dfec278dbc4626a759547_thumb.png",
"visible": true,
"is_temporary": false
}
}
Get file

Returns information about the given file.
AUTHORIZATIONS:
OAuth
PATH PARAMETERS

id
required
integer
File ID.
HEADER PARAMETERS

X-PF-Store-Id
string
Use this to specify which store you want to use (required only for account level token).

The store IDs can be retrieved with the Get basic information about stores endpoint.
Responses

200
OK
RESPONSE SCHEMA: application/json

code
integer
Response status code 200
result
object (File)
Information about the File
401
Unauthorized
404
Not found

GET
/files/{id}
Request samples

Curl

Copy
curl --location --request GET 'https://api.printful.com/files/{123}' \
--header 'Authorization: Bearer {oauth_token}'
Response samples

200401404
Content type
application/json

Copy
Expand all Collapse all
{
"code": 200,
"result": {
"type": "default",
"id": 10,
"url": "​https://www.example.com/files/tshirts/example.png",
"options": [],
"hash": "ea44330b887dfec278dbc4626a759547",
"filename": "shirt1.png",
"mime_type": "image/png",
"size": 45582633,
"width": 1000,
"height": 1000,
"dpi": 300,
"status": "ok",
"created": 1590051937,
"thumbnail_url": "https://files.cdn.printful.com/files/ea4/ea44330b887dfec278dbc4626a759547_thumb.png",
"preview_url": "https://files.cdn.printful.com/files/ea4/ea44330b887dfec278dbc4626a759547_thumb.png",
"visible": true,
"is_temporary": false
}
}
Return available thread colors from provided image URL

Returns colors in hexadecimal format.

Returned thread colors are matched as closely as possible to provided image colors.

See examples
REQUEST BODY SCHEMA: application/json
required

POST request body
file_url
string
URL to file
Responses

200
OK
RESPONSE SCHEMA: application/json

code
integer
Response status code 200
thread_colors
Array of strings
400
Bad Request
401
Unauthorized

POST
/files/thread-colors
Request samples

PayloadCurl
Content type
application/json

Copy
{
"file_url": "https://example.com/image.jpg"
}
Response samples

200400401
Content type
application/json

Copy
Expand all Collapse all
{
"code": 200,
"thread_colors": [
"#FFFFFF"
]
}
Shipping Rate API

The Shipping rate API calculates the shipping rates for an order based on the recipient's location and the contents of the order.

The returned shipping rate ID can be used to specify the shipping method when creating an order.

See Country/State Code API for information about the Country codes.

See Catalog API for information about the Variant IDs.

Note: The shipping rates endpoints are meant to be called only right before placing an order to display available shipping rates and methods.

Dynamic shipping rates can change even in the span of one hour because it takes live facility and carrier information into account. Different rates may be calculated for different products, quantities and recipient data.

Even daily downloads of this data, reused only for identical orders, can result in mismatches between the displayed rates and the charged rates, potentially resulting in customer dissatisfaction.

A CSV file containing flat rates data for different categories of products may be downloaded from https://www.printful.com/shipping-rates-report/shipping-rates-report/download and hardcoded to reduce the shipping rate volume massively if you use flat rate shipping.
Rate limiting: The default rate limit is 120 requests per 60 seconds.

Warning: If the summary item quantity count exceeds 100 then the rate limit is changed to 5 requests per 60 seconds.
A 60 seconds lockout is applied if request count is exceeded.
Calculate shipping rates

Returns available shipping options and rates for the given list of products.

Recipient Address Requirements:

Only country_code is required in the recipient object
state_code is only required for United States (US), Australia (AU), and Canada (CA)
All other recipient fields are optional
Note: Providing more address information may produce more precise results and more shipping options. While only the country code is required, including additional details like city, postal code, and state/province can help return more accurate shipping rates and additional delivery options.

Important: Shipping rates returned by this endpoint may differ from those returned by /orders/estimate-costs if your store has store shipping settings configured.

The /orders/estimate-costs endpoint automatically applies your store's shipping settings (including shipping markup), while this endpoint applies them only if the store shipping settings are enabled. To ensure consistent results between both endpoints, make sure your store shipping settings are enabled and properly configured in your Printful Dashboard.
AUTHORIZATIONS:
OAuth
HEADER PARAMETERS

X-PF-Store-Id
string
Use this to specify which store you want to use (required only for account level token).

The store IDs can be retrieved with the Get basic information about stores endpoint.
REQUEST BODY SCHEMA: application/json
required

POST request body
recipient
required
object (ShippingRatesAddress)
Recipient address information for shipping rate calculation.

Required fields:

country_code: Always required
Conditionally required fields:

state_code: Required for United States (US), Australia (AU), and Canada (CA)
Optional fields:

All other fields are optional but providing more information may produce more precise results and more shipping options.
items
required
Array of objects (ItemInfo)
Array of order items
currency
string
3 letter currency code (optional), required if the rates need to be converted to another currency instead of store default currency
locale
string
Locale in which shipping rate names will be returned. Available options: en_US (default), es_ES
Responses

200
OK
RESPONSE SCHEMA: application/json

code
integer
Response status code 200
result
Array of objects (ShippingInfo)
400
Bad Request
401
Unauthorized
404
Not found

POST
/shipping/rates
Request samples

PayloadCurl
Content type
application/json

Copy
Expand all Collapse all
{
"recipient": {
"address1": "19749 Dearborn St",
"address2": "Apt 2B",
"city": "Chatsworth",
"state_code": "CA",
"country_code": "US",
"zip": "91311",
"phone": "+1234567890"
},
"items": [
{}
],
"currency": "USD",
"locale": "en_US"
}
Response samples

200400401404
Content type
application/json

Copy
Expand all Collapse all
{
"code": 200,
"result": [
{}
]
}
Ecommerce Platform Sync API

The ecommerce platform sync API allows you to automatically assign Printful products and print files to the products in your online store (Shopify, Woocommerce, etc.) that is linked to Printful.

Sync Products & Sync Variants explained

Each product in your store can contain one or multiple variants (some ecommerce platforms would call these options) that the customer can purchase (imagine multiple sizes or colors of the same t-shirt design). When you link your ecommerce store to Printful, we create a copy of your product and variant lists on our side - we call it Sync Products and Sync Variants.

Similar to your store, products that are sold by Printful also consist of multiple variants. Each t-shirt model is available in many sizes and colors.

Image

The purpose of Sync Variants is to let you link each variant from your store that will be fulfilled by Printful with a design file(s) and specific variant from Printful product catalogue. When synced products are ordered, we'll know which Printful product needs to be printed, and the order is imported into Printful for fulfillment.

You can configure each Sync Variant in the Printful Dashboard manually. However, that can be quite a tedious and repetitive task if your store sells hundreds of products. This API is designed to help you automate this process.

Remember
Product data is not imported to Printful immediately after the product is created/updated in your ecommerce platform. Depending on the platform, it can take from a couple of seconds up to a few hours for the products to be available on Printful. Before the products are imported, you will not be able to update product information through this API.
External ID

External ID is a feature that allows you to reference Sync Products and Sync Variants by using the ID from your store.

When requesting Sync Products and Sync Variants, you can use both the Printful ID and your External ID (if you prefix it with the @ symbol).

GET /sync/products/11001  - reference by Printful Sync Product ID
GET /sync/products/@988123  - reference by Shopify (or other platform's) Product ID
GET /sync/variant/123456  - reference by Printful Sync Variant ID
GET /sync/variant/@123123  - reference by Shopify (or other platform's)  Variant ID
Specifying products

To specify the exact variant of the product, you have to use the variant_id attribute of the order item. Each available unique item (including size/color) has its own Variant ID that can be acquired through the Catalog API.

Adding print files

There are two ways to assign a print file to the item. One is to specify the File ID if the file already exists in the file library of the authorized store:

...
"files":
[
{
"id": 12345
},
],
...
Second, and the most convenient method is to specify the file URL. If a file with the same URL already exists, it will be reused:

...
"files":
[
{
"url": "http://example.com/t-shirts/123/front.pdf"
},
],
...
Specifying multiple files per item

Each item in the order has to be linked with one or multiple files. The available file types for each product are available from the Catalog API.

You can add one file for each type by specifying the type attribute. For the default type, this attribute can be skipped.

...
"files":
[
{
"type": "default",
"url": "http://example.com/t-shirts/123/front.pdf"
},
{
"type": "back",
"url": "http://example.com/t-shirts/123/back.pdf"
}
],
...
Remember that using additional files can increase the price of the item.

See examples
Get list of Sync Products

Returns list of Sync Product objects from your store.
AUTHORIZATIONS:
OAuth
QUERY PARAMETERS

search
string
Product search needle
offset
integer
Result set offset
limit
integer
Number of items per page (max 100)
status
string
Enum: "all" "synced" "unsynced" "ignored" "imported" "discontinued" "out_of_stock"
Parameter used to filter results by status/group of Sync Products
HEADER PARAMETERS

X-PF-Store-Id
string
Use this to specify which store you want to use (required only for account level token).

The store IDs can be retrieved with the Get basic information about stores endpoint.
Responses

200
OK
RESPONSE SCHEMA: application/json

code
integer
Response status code 200
paging
object (Paging)
Paging information
result
Array of objects (SyncProduct)
Array of SyncProduct
401
Unauthorized

GET
/sync/products
Request samples

Curl

Copy
curl --location --request GET 'https://api.printful.com/sync/products' \
--header 'Authorization: Bearer {oauth_token}'
Response samples

200401
Content type
application/json

Copy
Expand all Collapse all
{
"code": 200,
"paging": {
"total": 100,
"offset": 10,
"limit": 100
},
"result": [
{}
]
}
Get a Sync Product

Get information about a single Sync Product and its Sync Variants
AUTHORIZATIONS:
OAuth
PATH PARAMETERS

id
required
integer or string
Sync Product ID (integer) or External ID (if prefixed with @)
HEADER PARAMETERS

X-PF-Store-Id
string
Use this to specify which store you want to use (required only for account level token).

The store IDs can be retrieved with the Get basic information about stores endpoint.
Responses

200
OK
RESPONSE SCHEMA: application/json

code
integer
Response status code 200
result
object (SyncProductInfo)
401
Unauthorized
404
Not found

GET
/sync/products/{id}
Request samples

Curl

Copy
curl --location --request GET 'https://api.printful.com/sync/products/161636640' \
--header 'Authorization: Bearer {oauth_token}'
Response samples

200401404
Content type
application/json

Copy
Expand all Collapse all
{
"code": 200,
"result": {
"sync_product": {},
"sync_variants": []
}
}
Delete a Sync Product

Deletes a Sync Product with all of its Sync Variants
AUTHORIZATIONS:
OAuth
PATH PARAMETERS

id
required
integer or string
Sync Product ID (integer) or External ID (if prefixed with @)
HEADER PARAMETERS

X-PF-Store-Id
string
Use this to specify which store you want to use (required only for account level token).

The store IDs can be retrieved with the Get basic information about stores endpoint.
Responses

200
OK
RESPONSE SCHEMA: application/json

code
integer
Response status code 200
result
object (SyncProductInfo)
401
Unauthorized
404
Not found

DELETE
/sync/products/{id}
Request samples

Curl

Copy
curl --location --request DELETE 'https://api.printful.com/sync/products/161636640' \
--header 'Authorization: Bearer {oauth_token}'
Response samples

200401404
Content type
application/json

Copy
Expand all Collapse all
{
"code": 200,
"result": {
"sync_product": {},
"sync_variants": []
}
}
Get a Sync Variant

Get information about a single Sync Variant
AUTHORIZATIONS:
OAuth
PATH PARAMETERS

id
required
integer or string
Sync Variant ID (integer) or External ID (if prefixed with @)
HEADER PARAMETERS

X-PF-Store-Id
string
Use this to specify which store you want to use (required only for account level token).

The store IDs can be retrieved with the Get basic information about stores endpoint.
Responses

200
OK
RESPONSE SCHEMA: application/json

code
integer
Response status code 200
result
object (SyncVariantInfo)
401
Unauthorized
404
Not found

GET
/sync/variant/{id}
Request samples

Curl

Copy
curl --location --request GET 'https://api.printful.com/sync/variant/1781126748' \
--header 'Authorization: Bearer {oauth_token}'
Response samples

200401404
Content type
application/json

Copy
Expand all Collapse all
{
"code": 200,
"result": {
"sync_variant": {},
"sync_product": {}
}
}
Modify a Sync Variant

Modifies an existing Sync Variant.

Please note that in the request body you only need to specify the fields that need to be changed. See examples for more insights.

Rate limiting: Up to 10 requests per 60 seconds. A 60 seconds lockout is applied if request count is exceeded.

See examples
AUTHORIZATIONS:
OAuth
PATH PARAMETERS

id
required
integer or string
Sync Variant ID (integer) or External ID (if prefixed with @)
HEADER PARAMETERS

X-PF-Store-Id
string
Use this to specify which store you want to use (required only for account level token).

The store IDs can be retrieved with the Get basic information about stores endpoint.
REQUEST BODY SCHEMA: application/json
required

PUT request body
variant_id
integer
Printful Variant ID that this Sync Variant is synced to
retail_price
string
Retail price that this item is sold for
sku
string or null
SKU of this Sync Variant
is_ignored
boolean
If is set to true, indicates the Sync Variant has been marked as ignored by Printful for order imports. This also means that Printful will not handle the stock for Shopify stores that have marked this Sync Variant as ignored.
files
Array of objects (File)
Array of attached printfiles/preview images
options
Array of objects (SyncVariantOption)
Array of additional options for the configured product/variant See examples
Responses

200
OK
RESPONSE SCHEMA: application/json

code
integer
Response status code 200
result
object (SyncVariantInfo)
400
Bad Request
401
Unauthorized
404
Not found

PUT
/sync/variant/{id}
Request samples

PayloadCurl
Content type
application/json

Copy
Expand all Collapse all
{
"variant_id": 3001,
"retail_price": "29.99",
"sku": "SKU1234",
"is_ignored": false,
"files": [
{}
],
"options": [
{}
]
}
Response samples

200400401404
Content type
application/json

Copy
Expand all Collapse all
{
"code": 200,
"result": {
"sync_variant": {},
"sync_product": {}
}
}
Delete a Sync Variant

Deletes configuraton information (variant_id, print files and options) and disables automatic order importing for this Sync Variant.
AUTHORIZATIONS:
OAuth
PATH PARAMETERS

id
required
integer or string
Sync Variant ID (integer) or External ID (if prefixed with @)
HEADER PARAMETERS

X-PF-Store-Id
string
Use this to specify which store you want to use (required only for account level token).

The store IDs can be retrieved with the Get basic information about stores endpoint.
Responses

200
OK
RESPONSE SCHEMA: application/json

code
integer
Response status code 200
result
object (SyncVariantInfo)
401
Unauthorized
404
Not found

DELETE
/sync/variant/{id}
Request samples

Curl

Copy
curl --location --request DELETE 'https://api.printful.com/sync/variant/1781126748' \
--header 'Authorization: Bearer {oauth_token}'
Response samples

200401404
Content type
application/json

Copy
Expand all Collapse all
{
"code": 200,
"result": {
"sync_variant": {},
"sync_product": {}
}
}
Country/State Code API

To create an order, you have to use country and state codes to specify the recipient address. Both country code and state code are mandatory for orders to the USA, Canada and Australia. For other countries only the country code is needed to create an order.

Country codes are based on the ISO 3166-1 alpha-2 standard and are two letters long.

State codes are based on the ISO 3166-2 standard by omitting the country code part of the code and are used only for the USA, Canada, Japan and Australia.

All state/country codes that Printful accepts can be listed by this API.
Retrieve country list

Returns list of countries and states that are accepted by the Printful.
Responses

200
OK
RESPONSE SCHEMA: application/json

code
integer
Response status code 200
result
Array of objects (Country)
401
Unauthorized

GET
/countries
Request samples

Curl

Copy
curl --location --request GET 'https://api.printful.com/countries'
Response samples

200401
Content type
application/json

Copy
Expand all Collapse all
{
"code": 200,
"result": [
{}
]
}
Tax Rate API

Get a list of countries for tax calculation

Retrieve state list that requires sales tax calculation
Responses

200
OK
RESPONSE SCHEMA: application/json

code
integer
Response status code 200
result
Array of objects (Country)
401
Unauthorized
404
Not found

GET
/tax/countries
Request samples

Curl

Copy
curl --location --request GET 'https://api.printful.com/tax/countries'
Response samples

200401404
Content type
application/json

Copy
Expand all Collapse all
{
"code": 200,
"result": [
{}
]
}
Calculate tax rate Deprecated

Calculates sales tax rate for given address if required.

⚠️ Important – /tax/rates endpoint sunset
Since May 2023, the POST /tax/rates endpoint is no longer maintained and may return inaccurate results.

On July 29, 2025, we started the sunset process. The rate limit is being reduced by 10 RPM each week (starting with 60) until it reaches 0 on September 8, 2025, at which point the endpoint will be removed entirely.

There is no replacement endpoint in the Printful API for retrieving standalone tax rates. For accurate tax information, please use official government sources or external tax calculation providers.

If you require the total order cost including taxes, use the order creation or estimation endpoints.
REQUEST BODY SCHEMA: application/json
required

POST request body
recipient
required
object (TaxAddressInfo)
Recipient address information
Responses

200
OK
RESPONSE SCHEMA: application/json

code
integer
Response status code 200
result
object (TaxInfo)
Tax address information
404
Not found

POST
/tax/rates
Request samples

PayloadCurl
Content type
application/json

Copy
Expand all Collapse all
{
"recipient": {
"country_code": "US",
"state_code": "CA",
"city": "Chatsworth",
"zip": "91311"
}
}
Response samples

200404
Content type
application/json

Copy
Expand all Collapse all
{
"code": 200,
"result": {
"required": true,
"rate": 0.095,
"shipping_taxable": false
}
}
Webhook API

Webhooks are an API feature that allows your system to receive notifications about certain events.

When an event occurs, the Printful server (Webhook Simulator) will make a POST request to your defined URL that will contain a JSON object in the request body. Your server has to respond with HTTP status 2xx OK, otherwise, the request will be retried in increasing intervals (after 1, 4, 16, 64, 256 and 1024 minutes).

The JSON object will always contain these attributes:

type	string	Event type
created	timestamp	Event time
retries	integer	Number of previous attempts to deliver this webhook event
store	integer	ID of the store that the event occured to
data	Object	Additional data, depending on the event type
Please use Webhook Simulator to test your webhook event receiver.

To set up webhooks, use API requests described below:
Package shipped Webhook

Is called when a shipment with all or part of the ordered items is shipped.

If the order is shipped in multiple shipments, this event will be called for every shipment sent.

If some items are reshipped, a shipping notification will be sent again for the same items.
REQUEST BODY SCHEMA: application/json

Package shipped.
type
string
Event type
created
integer
Event time
retries
integer
Number of previous attempts to deliver this webhook event
store
integer
ID of the store that the event occured to
data
object (ShipmentInfo)
Shipment and order data
Responses

2xx
Data received
Request samples

Payload
Content type
application/json

Copy
Expand all Collapse all
{
"type": "package_shipped",
"created": 1622456737,
"retries": 2,
"store": 12,
"data": {
"shipment": {},
"order": {}
}
}
Package returned Webhook

Is called when a shipment is processed as returned to the fulfillment facility. To learn more about the reasons why a shipment might be returned, take a look at Printful's Return Policy
REQUEST BODY SCHEMA: application/json

Package returned.
type
string
Event type
created
integer
Event time
retries
integer
Number of previous attempts to deliver this webhook event
store
integer
ID of the store that the event occured to
data
object (ReturnInfo)
Shipment and order data
Responses

2xx
Data received
Request samples

Payload
Content type
application/json

Copy
Expand all Collapse all
{
"type": "package_returned",
"created": 1622456737,
"retries": 2,
"store": 12,
"data": {
"reason": "string",
"shipment": {},
"order": {}
}
}
Order created Webhook

Is called when the order is first created.
REQUEST BODY SCHEMA: application/json

Order created.
type
string
Event type
created
integer
Event time
retries
integer
Number of previous attempts to deliver this webhook event
store
integer
ID of the store that the event occured to
data
object (CreateInfo)
Created order data
Responses

2xx
Data received
Request samples

Payload
Content type
application/json

Copy
Expand all Collapse all
{
"type": "order_created",
"created": 1622456737,
"retries": 2,
"store": 12,
"data": {
"order": {}
}
}
Order updated Webhook

Is called when an existing order gets updated for any reason - including things that are covered with other webhooks like order_canceled.
REQUEST BODY SCHEMA: application/json

Order updated.
type
string
Event type
created
integer
Event time
retries
integer
Number of previous attempts to deliver this webhook event
store
integer
ID of the store that the event occured to
data
object (UpdateInfo)
Updated order data
Responses

2xx
Data received
Request samples

Payload
Content type
application/json

Copy
Expand all Collapse all
{
"type": "order_updated",
"created": 1622456737,
"retries": 2,
"store": 12,
"data": {
"order": {}
}
}
Order failed Webhook

Is called when a confirmed order changes its status to failed.

It can happen, for example, if printfiles can not be downloaded, are not valid image files or when there is a payment failure.
REQUEST BODY SCHEMA: application/json

Order failed.
type
string
Event type
created
integer
Event time
retries
integer
Number of previous attempts to deliver this webhook event
store
integer
ID of the store that the event occured to
data
object (FailureInfo)
Failure reason and order data
Responses

2xx
Data received
Request samples

Payload
Content type
application/json

Copy
Expand all Collapse all
{
"type": "order_failed",
"created": 1622456737,
"retries": 2,
"store": 12,
"data": {
"reason": "string",
"order": {}
}
}
Order canceled Webhook

Is called when a confirmed order changes its status to canceled.

It can happen when a submitted order is canceled from the dashboard or through the API or when the order is canceled by the Printful staff.
REQUEST BODY SCHEMA: application/json

Order canceled.
type
string
Event type
created
integer
Event time
retries
integer
Number of previous attempts to deliver this webhook event
store
integer
ID of the store that the event occured to
data
object (CancelInfo)
Cancel reason and order data
Responses

2xx
Data received
Request samples

Payload
Content type
application/json

Copy
Expand all Collapse all
{
"type": "order_canceled",
"created": 1622456737,
"retries": 2,
"store": 12,
"data": {
"reason": "string",
"order": {}
}
}
Product synced Webhook

Is called when a new product or variant is imported from the store's ecommerce integration.

See Ecommerce Platform Sync API
REQUEST BODY SCHEMA: application/json

Product synced.
type
string
Event type
created
integer
Event time
retries
integer
Number of previous attempts to deliver this webhook event
store
integer
ID of the store that the event occured to
data
object (SyncInfo)
Responses

2xx
Data received
Request samples

Payload
Content type
application/json

Copy
Expand all Collapse all
{
"type": "product_synced",
"created": 1622456737,
"retries": 2,
"store": 12,
"data": {
"sync_product": {}
}
}
Product updated Webhook

Is called when a new product or variant is created or updated in any way.

See Ecommerce Platform Sync API
REQUEST BODY SCHEMA: application/json

Product updated.
type
string
Event type
created
integer
Event time
retries
integer
Number of previous attempts to deliver this webhook event
store
integer
ID of the store that the event occured to
data
object (SyncInfo)
Responses

2xx
Data received
Request samples

Payload
Content type
application/json

Copy
Expand all Collapse all
{
"type": "product_updated",
"created": 1622456737,
"retries": 2,
"store": 12,
"data": {
"sync_product": {}
}
}
Product deleted Webhook

Is called when a new product or variant is deleted.

See Ecommerce Platform Sync API
REQUEST BODY SCHEMA: application/json

Product deleted.
type
string
Event type
created
integer
Event time
retries
integer
Number of previous attempts to deliver this webhook event
store
integer
ID of the store that the event occured to
data
object (SyncInfo)
Responses

2xx
Data received
Request samples

Payload
Content type
application/json

Copy
Expand all Collapse all
{
"type": "product_deleted",
"created": 1622456737,
"retries": 2,
"store": 12,
"data": {
"sync_product": {}
}
}
Stock updated Webhook

Is called when stock is updated for some of a product's variants.

Contains product id and ids of it's discontinued variants and variants that are out of stock. Variant ids that are not present should be considered as active and in stock.
REQUEST BODY SCHEMA: application/json

Stock updated.
type
string
Event type
created
integer
Event time
retries
integer
Number of previous attempts to deliver this webhook event
store
integer
ID of the store that the event occured to
data
object (ProductStock)
Responses

2xx
Data received
Request samples

Payload
Content type
application/json

Copy
Expand all Collapse all
{
"type": "stock_updated",
"created": 1622456737,
"retries": 2,
"store": 12,
"data": {
"product_id": 9001,
"variant_stock": {}
}
}
Order put hold Webhook

Is called when order is put on hold.
REQUEST BODY SCHEMA: application/json

Order put on hold.
type
string
Event type
created
integer
Event time
retries
integer
Number of previous attempts to deliver this webhook event
store
integer
ID of the store that the event occured to
data
object (OrderStatusChange)
Responses

2xx
Data received
Request samples

Payload
Content type
application/json

Copy
Expand all Collapse all
{
"type": "order_put_hold",
"created": 1622456737,
"retries": 2,
"store": 12,
"data": {
"reason": "string",
"order": {}
}
}
Order put hold approval Webhook

Is called when order is put on hold and there are changes that must be approved by the customer before fulfillment. Will contain a confirm hash that can be used to approve changes with the Approval Sheets Api.
REQUEST BODY SCHEMA: application/json

Order put on hold because it needs customer approval. You will receive an approval sheet with suggested changes and a confirmation hash so you can approve the changes if you agree with them.
type
string
Event type
created
integer
Event time
retries
integer
Number of previous attempts to deliver this webhook event
store
integer
ID of the store that the event occured to
data
object (OrderRequiresApproval)
Responses

2xx
Data received
Request samples

Payload
Content type
application/json

Copy
Expand all Collapse all
{
"type": "order_put_hold_approval",
"created": 1622456737,
"retries": 2,
"store": 12,
"data": {
"reason": "string",
"approval_files": [],
"order": {}
}
}
Order remove hold Webhook

Is called when order is removed from hold.
REQUEST BODY SCHEMA: application/json

Order removed from on hold.
type
string
Event type
created
integer
Event time
retries
integer
Number of previous attempts to deliver this webhook event
store
integer
ID of the store that the event occured to
data
object (OrderStatusChange)
Responses

2xx
Data received
Request samples

Payload
Content type
application/json

Copy
Expand all Collapse all
{
"type": "order_remove_hold",
"created": 1622456737,
"retries": 2,
"store": 12,
"data": {
"reason": "string",
"order": {}
}
}
Order refunded Webhook

Is called when a confirmed order has been refunded.
REQUEST BODY SCHEMA: application/json

Order refunded.
type
string
Event type
created
integer
Event time
retries
integer
Number of previous attempts to deliver this webhook event
store
integer
ID of the store that the event occured to
data
object (RefundInfo)
Refunded amount and order data
Responses

2xx
Data received
Request samples

Payload
Content type
application/json

Copy
Expand all Collapse all
{
"type": "order_refunded",
"created": 1622456737,
"retries": 2,
"store": 12,
"data": {
"amount": "13.50",
"order": {}
}
}
Get webhook configuration

Returns configured webhook URL and list of webhook event types enabled for the store
AUTHORIZATIONS:
OAuth
HEADER PARAMETERS

X-PF-Store-Id
string
Use this to specify which store you want to use (required only for account level token).

The store IDs can be retrieved with the Get basic information about stores endpoint.
Responses

200
OK
RESPONSE SCHEMA: application/json

code
integer
Response status code 200
result
object (WebhookInfo)
401
Unauthorized

GET
/webhooks
Request samples

Curl

Copy
curl --location --request GET 'https://api.printful.com/webhooks' \
--header 'Authorization: Bearer {oauth_token}'
Response samples

200401
Content type
application/json

Copy
Expand all Collapse all
{
"code": 200,
"result": {
"url": "​https://www.example.com/printful/webhook",
"types": [],
"params": {}
}
}
Set up webhook configuration

Use this endpoint to enable a webhook URL for a store and select webhook event types that will be sent to this URL.

Note that only one webhook URL can be active for a store, so calling this method disables all existing webhook configuration.

Setting up the Stock updated webhook requires passing IDs for products that need to be monitored for changes. Stock update webhook will only include information for specified products. These product IDs need to be set up using the params property.
AUTHORIZATIONS:
OAuth
HEADER PARAMETERS

X-PF-Store-Id
string
Use this to specify which store you want to use (required only for account level token).

The store IDs can be retrieved with the Get basic information about stores endpoint.
REQUEST BODY SCHEMA: application/json
required

POST request body
url
required
string
Webhook URL that will receive store's event notifications
types
required
Array of strings
Array of enabled webhook event types
params
object
Responses

200
OK
RESPONSE SCHEMA: application/json

code
integer
Response status code 200
result
object (WebhookInfo)
400
Bad Request
401
Unauthorized

POST
/webhooks
Request samples

PayloadCurl
Content type
application/json

Copy
Expand all Collapse all
{
"url": "​https://www.example.com/printful/webhook",
"types": [
"package_shipped",
"stock_updated"
],
"params": {
"stock_updated": {}
}
}
Response samples

200400401
Content type
application/json

Copy
Expand all Collapse all
{
"code": 200,
"result": {
"url": "​https://www.example.com/printful/webhook",
"types": [],
"params": {}
}
}
Disable webhook support

Removes the webhook URL and all event types from the store.
AUTHORIZATIONS:
OAuth
HEADER PARAMETERS

X-PF-Store-Id
string
Use this to specify which store you want to use (required only for account level token).

The store IDs can be retrieved with the Get basic information about stores endpoint.
Responses

200
OK
RESPONSE SCHEMA: application/json

code
integer
Response status code 200
result
object (WebhookInfo)
401
Unauthorized

DELETE
/webhooks
Request samples

Curl

Copy
curl --location --request DELETE 'https://api.printful.com/webhooks' \
--header 'Content-Type: application/json'
Response samples

200401
Content type
application/json

Copy
Expand all Collapse all
{
"code": 200,
"result": {
"url": "​https://www.example.com/printful/webhook",
"types": [],
"params": {}
}
}
Store Information API

Change packing slip

Modifies packing slip information of the currently authorized Printful store.
AUTHORIZATIONS:
OAuth
HEADER PARAMETERS

X-PF-Store-Id
string
Use this to specify which store you want to use (required only for account level token).

The store IDs can be retrieved with the Get basic information about stores endpoint.
REQUEST BODY SCHEMA: application/json
required

POST request body
Any of OrderPackingSlipOrderPackingSlipOrderPackingSlipOrderPackingSlip
email
required
string
Customer service email
phone
string
Customer service phone
message
string
Custom packing slip message
logo_url
string
URL address to a sticker we will put on a package. The provided image is converted to grayscale/1-bit monochrome image.
store_name
string
Store name override for the return address
custom_order_id
string
Your own Order ID that will be printed instead of Printful's Order ID
Responses

200
OK
RESPONSE SCHEMA: application/json

code
integer
Response status code 200
result
object
400
Bad Request
401
Unauthorized

POST
/store/packing-slip
Request samples

PayloadCurl
Content type
application/json

Copy
{
"email": "your-name@your-domain.com",
"phone": "+371 28888888",
"message": "Message on packing slip",
"logo_url": "​http://www.your-domain.com/packing-logo.png",
"store_name": "Your store name",
"custom_order_id": "kkk2344lm"
}
Response samples

200400401
Content type
application/json

Copy
Expand all Collapse all
{
"code": 200,
"result": {
"packing_slip": {}
}
}
Get basic information about stores

Get basic information about stores depending on the token access level
AUTHORIZATIONS:
OAuth
Responses

200
OK
RESPONSE SCHEMA: application/json

code
integer
Response status code 200
paging
object (Paging)
Paging information
result
Array of objects (StoreSummary)
400
Bad Request
401
Unauthorized
403
Forbidden

GET
/stores
Response samples

200400401403
Content type
application/json

Copy
Expand all Collapse all
{
"code": 200,
"paging": {
"total": 100,
"offset": 10,
"limit": 100
},
"result": [
{}
]
}
Get basic information about a store

Get basic information about a store based on provided ID
AUTHORIZATIONS:
OAuth
PATH PARAMETERS

id
required
integer
Store ID
Responses

200
OK
RESPONSE SCHEMA: application/json

code
integer
Response status code 200
result
object (StoreDetails)
Information about the Store
400
Bad Request
401
Unauthorized
403
Forbidden

GET
/stores/{id}
Response samples

200400401403
Content type
application/json

Copy
Expand all Collapse all
{
"code": 200,
"result": {
"id": 10,
"type": "native",
"name": "My Store"
}
}
Mockup Generator API

To generate mockups, first, you need to decide on which products you want them. API methods on retrieving products and variants can be found in the Catalog API.

Note: Remember to distinguish the difference between a product id and a variant id. Some API endpoints require an id from a variant and some from a product.

Important: Jewelry products are not supported via API.

Print files

A print file defines resolution which should be used to create a mockup or to submit an actual order.

Information about product variant print files can be retrieved from the print file endpoint.

For example, a 10×10 poster requires a 1500×1500 pixel print file to produce a 150 DPI print. You can use higher resolution files to achieve a better result, but keep the side aspect ratio the same as the defined for the print file. That means, if you use a 3000×3000 pixel file, it will produce a 300 DPI print. But if you use a 3000×1500 pixel file ( different aspect ratio) on a 10×10 poster, some cropping will occur. Print file's fill_mode parameter defines if cropping will happen, or the file will be fitted on the resulting print area of the product.

Some print files can be rotated. can_rotate field defines this feature. This mostly applies to wall art products and should be used if you want to generate a horizontal or a vertical product mockup.

Wall art print files are defined horizontally. If you wish to create a vertical mockup, you can rotate the file's print file and the generated mockup will be in the given orientation. For example, 16×12 poster print file is 2400×1800 pixels which generate it horizontally. If you wish to get a vertical mockup, you create the print file as 1800×2400 pixels. The same strategy applies when you submit an order.

Print files are often re-used for multiple variants and products. For example, a 14×14 poster uses the same print file as a framed poster. Most of the t-shirt front prints use the same print file too.

Note: When you generate mockups there is no need to provide a full-sized print file. Mockups are generated up to 2000px wide, so you can downscale your print file to 2000px. This will reduce the processing time on your and Printful's side. Print file image file size limit: 50MB.

Mockup generation

Mockup generation requires some time, that is why it cannot happen in real-time.

When you request a mockup to be generated, a task is created and you receive the task key which can then be used to retrieve the generated mockup list. We cannot guarantee that after a certain time the mockups will be generated, so you will have to check frequently if the task is done. The first request for a result should not be sooner than 10 seconds. So plan that the generation task will be done in two steps - creating a task and the checking with intervals if the task is ready.

Important
URLs to mockup images are temporary, they will expire after 72h, so you have to store them on your server.
Process flow

Decide which product variants you want to generate.
Retrieve the list of print files for chosen product and variants. Use the variant print file mappings to determine which print file you need to generate for specific placement on a specific product's variant.
Upload your file to a public URL that matches the print file size ratio (or provide positions for the generation request)
Create a mockup generation task and store the task key.
Use the task key to check if the task is completed. If still pending, repeat after an interval.
When the task is done, download and store mockups on your server. Mockup URLs are temporary and will be removed after a day.
Available techniques

The /mockup-generator/printfiles/{id} and /mockup-generator/templates/{id} endpoint accept technique parameter.

The following table presents the available values of this parameter.

Value	Description
DIGITAL	Digital printing
CUT-SEW	Cut & sew sublimation
UV	UV printing
EMBROIDERY	Embroidery
SUBLIMATION	Sublimation
ENGRAVING	Engraving
DTG	DTG printing
Usage example

Let's take an example. You want to offer users to design of their t-shirt.

We'll pick this shirt as an example Bella + Canvas 3001 Unisex T-shirt

Its product id is 71.

Let's fetch some variants available for this shirt: https://api.printful.com/products/71

We'll choose a white and black shirt in M, L, XL sizes. Respective variant ids: 4012, 4013, 4014, 4017, 4018 and 4019.

Next, we need to get the print file sizes for these variants: https://api.printful.com/mockup-generator/printfiles/71

We see that there are two placements available for this product - front and back. Posters, for example, will only have one placement called default.

By looking up our picked variant ids, we see that they all use the same print file for back and front prints:

{
"product_id": 71,
"available_placements": {
"front": "Front print",
"back": "Back print",
"label_outside": "Outside label"
},
"printfiles": [
{
"printfile_id": 1,
"width": 1800,
"height": 2400,
"dpi": 150,
"fill_mode": "fit",
"can_rotate": false
}
],
"variant_printfiles": [
{
"variant_id": 4012,
"placements": {
"front": 1,
"back": 1
}
}
]
}
dpi For given width and height, this is the resulting DPI on the actual product.
fill_mode Possible values: "fit" or "cover". Indicates in what mode mockups will be generated.
can_rotate Posters, for example, allow rotation. If you pass the image in horizontal positions.
placements.front Printfile id.
We can see that the full print file size is 1800×2400 for back and front prints for chosen variants.

When we know the size of the print file, we need to calculate the positions. Position values are relative here, image size does not have to match the width and height of positions. When mockup is generated we will fit the position area inside the print area or will cover it, depending on the print file fill_mode value.

Positions given below would result in a square image centered vertically within the print area.

{
"area_width": 1800,
"area_height": 2400,
"width": 1800,
"height": 1800,
"top": 300,
"left": 0
}
area_width Relative width of the print area.
area_height Relative height of the print area.
width Relative width of your image.
height Relative height of your image.
top Relative image top offset within the area.
left Relative image left offset within the area.
Important
For posters, canvas, and other products which print files allow rotation (can_rotate value in print file response) you can flip width and height to create a product mockup that is horizontal or vertical.
Once we have calculated the positions, we can perform the actual mockup generation using the mockup generator endpoint: POST to https://api.printful.com/mockup-generator/create-task/71 with body parameters:

{
"variant_ids": [
4012,
4013,
4014,
4017,
4018,
4019
],
"format": "jpg",
"files": [
{
"placement": "front",
"image_url": "http://your-site/path-to-front-printfile.jpg",
"position": {
"area_width": 1800,
"area_height": 2400,
"width": 1800,
"height": 1800,
"top": 300,
"left": 0
}
},
{
"placement": "back",
"image_url": "http://your-site/path-to-back-printfile.jpg",
"position": {
"area_width": 1800,
"area_height": 2400,
"width": 1800,
"height": 1800,
"top": 300,
"left": 0
}
}
]
}
In response, you will receive the task key and current task status:

{
"task_key": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
"status": "pending"
}
After an interval of a few seconds, you can try to check for the result by calling a GET request on https://api.printful.com/mockup-generator/task?task_key=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx If the task is completed, the response will be like this:

{
"task_key": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
"status": "completed",
"mockups": [
{
"variant_ids": [
4011,
4012,
4013
],
"placement": "front",
"mockup_url": "https://url-to/front-mockup.png"
},
{
"variant_ids": [
4011,
4012,
4013
],
"placement": "back",
"mockup_url": "https://url-to/back-mockup.png"
},
{
"variant_ids": [
4016,
4017,
4018
],
"placement": "front",
"mockup_url": "https://url-to/front-mockup.png"
},
{
"variant_ids": [
4016,
4017,
4018
],
"placement": "back",
"mockup_url": "https://url-to/back-mockup.png"
}
]
}
At this point, you just have to download the mockup URLs and store them on your server and you're good to go!

Layout templates

If you wish to build your mockup generator UI, this is the place to start. Using the layout template endpoint you can get template images and positions necessary to create a tool where your users can position their files on.

If you want to create a mug generator, for example, you call the endpoint /mockup-generator/templates/19 with mug product ID. By looking at the variant mapping field, we can determine that for variant 1320 11oz mug we have to use the template with ID 919. This is what template structure looks like:

{
"template_id": 919,
"image_url": "https://www.printful.com/files/generator/40/11oz_template.png",
"background_url": null,
"background_color": null,
"printfile_id": 43,
"template_width": 560,
"template_height": 295,
"print_area_width": 520,
"print_area_height": 202,
"print_area_top": 18,
"print_area_left": 20,
"is_template_on_front": true
}
printfile_id We can retrieve the actual printfile size from the printfiles endpoint.
template_width This is the main container width, pixels.
template_height Main container height.
print_area_width Inner area where positioning happens.
print_area_height Inner area.
print_area_top Offset from the main container.
print_area_left Offset from the main container.
is_template_on_front This indicates if we should show the user image below or above the template image.
Given this information, we can create a simple HTML markup:


<div style="position: relative; width: 520px; height: 295px;">
    <div style="position: absolute; width: 520px; height: 202px; top:18px; left:20px; background:rgba(255,233,230,0.33)">
        <img alt="Printful logo" src="https://printful.com/static/images/layout/logo-printful.png"
             style="position: absolute; left: 43px; top: 77px; width: 140px; height: 63px;">
    </div>
    <div style="position: absolute; width: 560px; height: 295px; background:url(/files/generator/40/11oz_template.png) center center no-repeat"></div>
</div>
Which would look like this in the browser:

Printful logo
To generate mockups with positions above, we perform a POST request to https://api.printful.com/mockup-generator/create-task/19 with body parameters:

{
"variant_ids": [
1320
],
"format": "jpg",
"files": [
{
"placement": "default",
"image_url": "https://www.printful.test/static/images/layout/logo-printful.png",
"position": {
"area_width": 520,
"area_height": 202,
"width": 140,
"height": 63,
"top": 77,
"left": 43
}
}
]
}
area_width Value of print_area_width in the template.
area_height Value of print_area_height in the template.
width Image width.
height Image height.
top Image top offset in area.
left Image left offset in area.
Choosing mockup styles

To choose which mockup styles to generate, you have to specify options and option_groups parameters in the request. If these parameters are not present in the request, the system will generate the first available mockup. If you are not planning to utilize all available mockups, it is advised to limit the requested mockups. Not limiting requested mockups will cause bigger task processing times and overall resource waste.

To find available options and option_groups for a given product, you have to use /mockup-generator/printfiles/{id} endpoint and search for options and option_groups fields in the response. See examples below.

{
"variant_ids": [4021],
"format": "png",
"option_groups": ["Flat"],
"options": ["Front"],
"files": [
{
"placement": "front",
"image_url": "https://www.printful.com/static/images/layout/logo-printful.png"
}
]
}
Using lifelike effect

Lifelike is a feature that simulates how dark designs will look over dark colour products and is only used in mockup generation. For that, an extra file with special effect is created for each placement.

{
"variant_ids": [4018],
"format": "png",
"product_options": {
"lifelike": true
},
"files": [
{
"placement": "front",
"image_url": "https://www.printful.com/static/images/layout/logo-printful.png"
}
]
}
Mockup without lifelike	Mockup with lifelike
Image	Image
Create a mockup generation task

Creates an asynchronous mockup generation task. Generation result can be retrieved using mockup generation task retrieval endpoint.
Rate limiting: Up to 10 requests per 60 seconds for established stores; 2 requests per 60 seconds for new stores. Currently available rate is returned in response headers. A 60 seconds lockout is applied if request count is exceeded. We also limit the number of files that may be generated to 20,000 files per account in a 24-hour period.
AUTHORIZATIONS:
OAuth
PATH PARAMETERS

id
required
integer
Product ID.
HEADER PARAMETERS

X-PF-Store-Id
string
Use this to specify which store you want to use (required only for account level token).

The store IDs can be retrieved with the Get basic information about stores endpoint.
REQUEST BODY SCHEMA: application/json
required

POST request body
variant_ids
Array of integers
List of variant ids you want to generate.
format
string
Enum: "jpg" "png"
Generated file format. PNG will have a transparent background, JPG will have a smaller file size.
width
integer
Width of the resulting mockup images (min 50, max 2000, default is 1000)
product_options
object
Key-value list of product options (embroidery thread, stitch colors). Product options can be found in Catalog API endpoint. See examples
option_groups
Array of strings
List of option group names you want to generate. Product's option groups can be found in printfile API request.
options
Array of strings
List of option names you want to generate. Product's options can be found in printfile API request.
files
Array of objects (GenerationTaskFile)
product_template_id
integer
Product template ID. Use instead of files parameter.
Responses

200
OK
RESPONSE SCHEMA: application/json

code
integer
Response status code 200
result
object (GenerationTask)
GenerationTask
400
Bad Request
401
Unauthorized
404
Not found

POST
/mockup-generator/create-task/{id}
Request samples

PayloadCurl
Content type
application/json

Copy
Expand all Collapse all
{
"variant_ids": [
4012,
4013,
4014,
4017,
4018,
4019
],
"format": "jpg",
"width": 0,
"product_options": { },
"option_groups": [
"string"
],
"options": [
"string"
],
"files": [
{}
],
"product_template_id": 123
}
Response samples

200400401404
Content type
application/json

Copy
Expand all Collapse all
{
"code": 200,
"result": {
"task_key": "123456",
"status": "completed",
"error": "string",
"mockups": [],
"printfiles": []
}
}
Retrieve product variant printfiles

List of printfiles available for products variants. Printfile indicates what file resolution should be used to create a mockup or submit an order.

This endpoint uses DTG as a default printing technique for products with more than one technique available. For products with DTG and more techniques available please specify the correct technique in query by using the `technique` parameter. For more information read the examples.
AUTHORIZATIONS:
OAuth
PATH PARAMETERS

id
required
integer
Product ID.
QUERY PARAMETERS

orientation
string
Enum: "horizontal" "vertical"
Optional orientation for wall art product printfiles. Allowed values: horizontal, vertical
technique
string
Optional technique for product. This can be used in cases where product supports multiple techniques like DTG and embroidery
HEADER PARAMETERS

X-PF-Store-Id
string
Use this to specify which store you want to use (required only for account level token).

The store IDs can be retrieved with the Get basic information about stores endpoint.
Responses

200
OK
RESPONSE SCHEMA: application/json

code
integer
Response status code 200
result
object (PrintfileInfo)
Printfile info
401
Unauthorized
404
Not found

GET
/mockup-generator/printfiles/{id}
Request samples

Curl

Copy
curl --location --request GET 'https://api.printful.com/mockup-generator/printfiles/1' \
--header 'Authorization: Bearer {oauth_token}'
Response samples

200401404
Content type
application/json

Copy
Expand all Collapse all
{
"code": 200,
"result": {
"product_id": 71,
"available_placements": {},
"printfiles": [],
"variant_printfiles": [],
"option_groups": [],
"options": []
}
}
Mockup generation task result

Returns asynchronous mockup generation task result. If generation task is completed, it will contain a list of generated mockups.
AUTHORIZATIONS:
OAuth
QUERY PARAMETERS

task_key
required
string
Task key retrieved when creating the generation task.
HEADER PARAMETERS

X-PF-Store-Id
string
Use this to specify which store you want to use (required only for account level token).

The store IDs can be retrieved with the Get basic information about stores endpoint.
Responses

200
OK
RESPONSE SCHEMA: application/json

code
integer
Response status code 200
result
object (GenerationTask)
GenerationTask
401
Unauthorized
404
Not found

GET
/mockup-generator/task
Request samples

Curl

Copy
curl --location --request GET 'https://api.printful.com/mockup-generator/task?task_key=3123' \
--header 'Authorization: Bearer {oauth_token}'
Response samples

200401404
Content type
application/json

Copy
Expand all Collapse all
{
"code": 200,
"result": {
"task_key": "123456",
"status": "completed",
"error": "string",
"mockups": [],
"printfiles": []
}
}
Layout templates

Retrieve list of templates that can be used for client-side positioning.

This endpoint uses DTG as a default printing technique for product layouts with more than one technique available. For products with DTG and more techniques available please specify the correct technique in query by using the `technique` parameter. For more information read the examples.
AUTHORIZATIONS:
OAuth
PATH PARAMETERS

id
required
integer
Product ID.
QUERY PARAMETERS

orientation
string
Enum: "horizontal" "vertical"
Optional orientation for wall art product printfiles. Allowed values: horizontal, vertical
technique
string
Optional technique for product. This can be used in cases where product supports multiple techniques like DTG and embroidery
HEADER PARAMETERS

X-PF-Store-Id
string
Use this to specify which store you want to use (required only for account level token).

The store IDs can be retrieved with the Get basic information about stores endpoint.
Responses

200
OK
RESPONSE SCHEMA: application/json

code
integer
Response status code 200
result
object (ProductTemplate)
Product Template
401
Unauthorized
404
Not found

GET
/mockup-generator/templates/{id}
Request samples

Curl

Copy
curl --location --request GET 'https://api.printful.com/mockup-generator/templates/71' \
--header 'Authorization: Bearer {oauth_token}'
Response samples

200401404
Content type
application/json

Copy
Expand all Collapse all
{
"code": 200,
"result": {
"version": 1,
"min_dpi": 300,
"variant_mapping": [],
"templates": [],
"conflicting_placements": []
}
}
Warehouse Products API

Warehouse Products API
Get a list of your warehouse products

Returns a list of warehouse products from your store

The response for this endpoint was documented as paginated, although it was not paginated. The behavior will be fixed and the paginated result will be set as the default. Currently to get paginated results please send trueor 1 in X-PF-Force-Pagination header.
AUTHORIZATIONS:
OAuth
QUERY PARAMETERS

query
string
Filter by partial or full product name
limit
integer
Number of items per page (max 100)
offset
integer
Result set offset
HEADER PARAMETERS

X-PF-Force-Pagination
boolean or integer
Whether the pagination behavior should be forced. The response will be paginated if the value is true or 1.
X-PF-Store-Id
string
Use this to specify which store you want to use (required only for account level token).

The store IDs can be retrieved with the Get basic information about stores endpoint.
Responses

200
OK
RESPONSE SCHEMA: application/json

code
integer
Response status code 200
result
Array of objects (WarehouseProduct)
Array of WarehouseProducts
paging
object (Paging)
Paging information
401
Unauthorized

GET
/warehouse/products
Request samples

Curl

Copy
curl --location --request GET 'https://api.printful.com/warehouse/products?query=some?offset=0&limit=100' \
--header 'Authorization: Bearer {oauth_token}'
Response samples

200401
Content type
application/json

Copy
Expand all Collapse all
{
"code": 200,
"result": [
{}
],
"paging": {
"total": 100,
"offset": 10,
"limit": 100
}
}
Get warehouse product data

Returns warehouse product data by ID
AUTHORIZATIONS:
OAuth
PATH PARAMETERS

id
required
integer or string
Product ID
HEADER PARAMETERS

X-PF-Store-Id
string
Use this to specify which store you want to use (required only for account level token).

The store IDs can be retrieved with the Get basic information about stores endpoint.
Responses

200
OK
RESPONSE SCHEMA: application/json

code
integer
Response status code 200
result
object (WarehouseProduct)
Warehouse product data
401
Unauthorized
404
Not found

GET
/warehouse/products/{id}
Request samples

Curl

Copy
curl --location --request GET 'https://api.printful.com/warehouse/products/12' \
--header 'Authorization: Bearer {oauth_token}'
Response samples

200401404
Content type
application/json

Copy
Expand all Collapse all
{
"code": 200,
"result": {
"id": 12,
"name": "Some product name",
"status": "draft",
"currency": "USD",
"image_url": "url.to/your/image/location.png",
"retail_price": 12.99,
"variants": []
}
}
Reports API

The Reports API lets you retrieve reports like the statistics related to the orders fulfilled for your stores.
Get statistics

Returns statistics for specified report types.

You need to specify the report types you want to retrieve in the report_types query parameter as a comma-separated list, e.g. report_types=sales_and_costs,profit.

Note: You cannot get statistics for a period longer than 6 months.

Example

To get statistics in the default currency of a store for sales_and_costs and profit reports for August 2022, you can use the following URL: https://api.printful.com/reports/statistics?report_types=sales_and_costs,profit&date_from=2022-08-01&date_to=2022-08-31.

Report types

Currently, the following report types are available:

Report type	Description
sales_and_costs	Detailed information on sales and costs grouped by date.
sales_and_costs_summary	Short information on sales and costs grouped by date.
printful_costs	Amount paid to Printful for fulfillment and shipping.
profit	Profit in the specified period.
total_paid_orders	The number of paid orders in the specified period.
costs_by_amount	Information on costs by amount grouped by date.
costs_by_product	Information on costs grouped by product.
costs_by_variant	Information on costs grouped by variant.
average_fulfillment_time	Average time it took Printful to fulfill your orders.
The response structure for the specific reports is documented in the response schema (result.store_statistics.[reportName]).
AUTHORIZATIONS:
OAuth
QUERY PARAMETERS

date_from
required
string <date>
Example: date_from=2022-08-01
The beginning of the period to get the statistics from (date in Y-m-d format).
date_to
required
string <date>
Example: date_to=2022-08-31
The end of the period to get the statistics from (date in Y-m-d format).
currency
string
Example: currency=USD
The currency (3-letter code) to return the statistics in. You can also specify display_currency as the value to get the statistics in the account's display currency. The store currency will be used by default.
report_types
required
string
Example: report_types=sales_and_costs,profit
A comma-separated list of report types to be retrieved.
HEADER PARAMETERS

X-PF-Store-Id
string
Use this to specify which store you want to use (required only for account level token).

The store IDs can be retrieved with the Get basic information about stores endpoint.
Responses

200
OK
RESPONSE SCHEMA: application/json

code
integer
Response status code 200
result
object (Statistics)
Statistics
400
Bad Request
401
Unauthorized
404
Not found

GET
/reports/statistics
Request samples

Curl

Copy
curl --location --request GET 'https://api.printful.com/reports/statistics?report_types=sales_and_costs,profit&date_from=2022-08-01&date_to=2022-08-31&currency=PLN' \
--header 'Authorization: Bearer {oauth_token}'
Response samples

200400401404
Content type
application/json

Copy
Expand all Collapse all
{
"code": 200,
"result": {
"store_statistics": []
}
}
Approval Sheets API

Approval Sheets API
Retrieve a list of approval sheets

Retrieve a list of approval sheets confirming suggested changes to files of on hold orders.
HEADER PARAMETERS

X-PF-Store-Id
string
Use this to specify which store you want to use (required only for account level token).

The store IDs can be retrieved with the Get basic information about stores endpoint.
Responses

200
OK
RESPONSE SCHEMA: application/json

code
integer
Response status code 200
result
Array of objects (ApprovalSheet)
400
Bad Request
401
Unauthorized

GET
/approval-sheets
Response samples

200400401
Content type
application/json

Copy
Expand all Collapse all
{
"code": 200,
"result": [
{}
]
}
Approve a design

Uses the confirm hash of an approval sheet to approve a design and remove the hold on an order
QUERY PARAMETERS

confirm_hash
required
string
Example: confirm_hash=a14e51714be01f98487fcf5131727d31
The confirm hash for the approval sheet you would like to approve.
HEADER PARAMETERS

X-PF-Store-Id
string
Use this to specify which store you want to use (required only for account level token).

The store IDs can be retrieved with the Get basic information about stores endpoint.
REQUEST BODY SCHEMA: application/json
required

POST request body
status
required
string
Value: "approved"
Responses

200
OK
RESPONSE SCHEMA: application/json

code
integer
Response status code 200
result
object
400
Bad Request
401
Unauthorized
404
Not found

POST
/approval-sheets
Request samples

Payload
Content type
application/json

Copy
{
"status": "approved"
}
Response samples

200400401404
Content type
application/json

Copy
Expand all Collapse all
{
"code": 200,
"result": {
"message": "Design approval submitted successfully"
}
}
Submit changes to an approval sheet

Use this to submit alternative changes to a design that has an approval sheet
QUERY PARAMETERS

confirm_hash
required
string
Example: confirm_hash=a14e51714be01f98487fcf5131727d31
The confirm hash for the approval sheet you would like to approve.
HEADER PARAMETERS

X-PF-Store-Id
string
Use this to specify which store you want to use (required only for account level token).

The store IDs can be retrieved with the Get basic information about stores endpoint.
REQUEST BODY SCHEMA: application/json
required

POST request body
message
required
string
A message to send to Printful designers. Customers should use this to describe the changes they want.
files
required
Array of objects
An array of images to help describe the requested changes. Consider using the mockup generator to generate these images. The array is required but can be empty if you do not want to email any images.
Responses

200
OK
RESPONSE SCHEMA: application/json

code
integer
Response status code 200
result
object (ApprovalSheet)
Approval sheet
400
Bad Request
401
Unauthorized

POST
/approval-sheets/changes
Request samples

Payload
Content type
application/json

Copy
Expand all Collapse all
{
"message": "The design needs to be aligned to the left",
"files": [
{}
]
}
Response samples

200400401
Content type
application/json

Copy
Expand all Collapse all
{
"code": 200,
"result": {
"id": 2,
"status": "waiting_for_action",
"confirm_hash": "a14e51714be01f98487fcf5131727d31",
"submitted_design": "https://s3.staging.printful.com/upload/approval-design/ae/ae7b3d3e965c238b3e5c1a4e15696f07_l",
"recommended_design": "https://s3.staging.printful.com/upload/approval-design/aa/aaf9e1c6b32cb7a2c04d2746108d4124_l",
"approval_sheet": "https://www.printful.test/dashboard/order/download-approval-sheet-pdf?confirmationHash=13aa35854bfc67a85b7ce231aef2ae8"
}
}
Common

Options

Options allow for additional modification of how product will look.

List of currently available thread color options
List of currently available Text thread color options
List of currently available other options
List of currently available file options
Placements

Complete list of every placement
Embroidery

Manually defining thread colors

Whenever the embroidery placement is used it's also necessary to specify thread colors which should be used. Thread color option must be matched with appropriate placement.
To determine what thread colors could be used you can use thread color suggestion endpoint and then adjust thread colors manually according to your taste.
Note that you can specify max 6 thread colors

"files": [
{
"type": "embroidery_outside_left",
"url": "https://www.printful.com/static/images/layout/printful-logo.png"
}
],
"options": [
{
"id": "thread_colors_outside_left",
"value": ["#FFFFFF", "#000000", "#96A1A8", "#A67843", "#FFCC00", "#E25C27"]
}
]
Automatic thread color

Instead of providing thread colors manually you can also use the auto_thread_color which will match available thread colors to provided image.

"files": [
{
"type": "embroidery_outside_left",
"url": "https://www.printful.com/static/images/layout/printful-logo.png",
"options": [
{
"id": "auto_thread_color",
"value": true
}
]
}
]
Unlimited color

When using the embroidery technique you are limited to a range of predefined thread colors. If you would like to use an unlimited range of thread colors please use Unlimited Color (additional cost will be added). To use Unlimited Color add for each file object an extra parameter in options with id: full_color. While using Unlimited Color you don’t need to specify thread colors. The full_color option can be used in Orders, Products, Mockup Generator and Ecommerce Platform Sync API.

"items": [
{
"variant_id": 4468,
"quantity": 1,
"files": [
{
"type": "embroidery_back",
"url": "https://www.printful.com/static/images/layout/printful-logo.png",
"options": [
{
"id": "full_color",
"value": true
}
]
}
]
}
]
Unlimited color is available for selected products. To distinguish products with unlimited color option and pricing please see catalog example response for a product with this option available.
Example order

Mockup without Unlimited Color	Mockup with Unlimited Color
Image	Image
Other resources

Developer support

The previous dedicated developer support channel is not currently monitored.

With all questions, including ones related to our API, please contact our Customer Support at https://www.printful.com/contacts.
Bug reporting

To report a potential security vulnerability, please send a detailed email to the contacts described in our security.txt file.

To help us investigate and validate your findings, please include the following information in your report:

A clear description of the vulnerability, including its potential impact.
Detailed steps to reproduce the vulnerability, including any URLs, parameters, or screenshots.
Your contact information, so we can follow up with you.
For security reasons, please encrypt your submission with the following PGP key.

Guidelines for Responsible Testing

To protect our systems and users, we ask that you act in good faith and follow these guidelines while conducting your research:

Avoid actions that could disrupt our services, such as denial-of-service (DoS) attacks.
Do not access, modify, or delete data more than it is necessary to demonstrate the impact of the issue.
Recognition and Bounties

We are grateful for the community's efforts in helping us to keep our platform safe. Your suggestions and reports are thoroughly investigated, and we will work with you to resolve valid security issues in our platform.

Please note that we do not offer a bug bounty program or provide monetary compensation for vulnerability disclosures.

Thank you for helping us keep Printful and our users safe.
Webhook Simulator

Webhook Simulator is a tool that allows you to test your webhook functionality. It will send a selected event type to your webhook URL. This way you will be able to easily develop and test your webhook handlers.
Basic use cases

Basic use cases

All the API integrations begin with a decision on how to authenticate with the Printful API. The most common use cases for Printful API integrations are:

Authentication Methods
Private API Token
Public App OAuth
Single Printful Account
Single Printful Account of Marketplace Owner
Multiple Printful Accounts
Merchant 1
Merchant 2
Merchant 3
Private API token Means that you are building a solution for your own store, using a single Printful account.
Printful API
Single Shop
End User
Printful API
Single Shop
End User
User can now design and order products
Access Single Shop
User Account Linked Successfully
Authenticate with API Token
Return Authentication Success
Request Product Catalog
Retrieve Product Catalog
Return Product Catalog
Display Product Catalog
Place Order
Create Order
Order Created Successfully
Order Confirmation and Tracking
Public App OAuth Is used for more complex integrations, where you are building an app that will be used by multiple users, each with their own Printful account. For example a merchant platform.
Printful API
Public App (Marketplace)
End User
Printful API
Public App (Marketplace)
End User
User can now design and order products
App manages multiple users independently
Access Public App (Marketplace)
Redirect to Printful Authorization Page
Authorize App (Grant Permissions)
Return Authorization Code
Provide Authorization Code
Exchange Authorization Code for Access Token
Return Access Token
User Account Linked Successfully
Request Product Catalog
Return Product Catalog
Place Order
Create Order on Behalf of User
Order Created Successfully
Order Confirmation and Tracking
Both private api token and public app can be created in https://developers.printful.com
Webshop integration offering pre-designed products to the end customers

1.Authenticate: Obtain your private API key from the Printful dashboard.

2.Set Up Webhooks: Configure webhooks to receive updates about orders, products, and other events.

3.Sync Products: Use the API to fetch and create designed products in the Printful.

4.Create Orders: Send order data to Printful when a customer places an order on a sync product.

5.Track Orders: Use the API to track the status of orders and shipments.

Obtain API Key
Set Up Webhooks
Sync Products
Create Orders
Track Orders
Update Webshop
Webshop integration with the products designed on the fly by the end customers

1.Authenticate: Obtain your private API key from the Printful dashboard.

2.Retrieve Catalog Products: Use the API to fetch available catalog products and display them to customers for customization.

3.Customize Products: Allow customers to design products (e.g., upload images, select colors, etc.) using your webshop interface.

4.Create Orders on the Fly: When a customer places an order, send the customized product details and order data directly to Printful.

5.Track Orders: Use the API to track the status of orders and shipments.

6.Update Webshop: Update your webshop with order statuses and shipment tracking information.

Obtain API Key
Retrieve Catalog Products
Customize Products
Create Orders on the Fly
Track Orders
Update Webshop
Webshop integration with the product catalog created by the merchant

Printful API
Merchant
End User
Printful API
Merchant
End User
Merchant can now design and sell products
Access Merchant Platform
User Account Linked Successfully
Authenticate with API Token
Return Authentication Success
Retrieve Product Catalog
Return Product Catalog
Sync Product Data
Product Synced Successfully
Request sync product catalog
Request sync products
Return sync products
Display sync product catalog
Place Order
Create Order
Order Created Successfully
Order Confirmation and Tracking
Embedded Designer integration

Embedded designer is embeddable JavaScript component that allows the shop owner not to build their own product designer, but instead use Printful's product designer. It is used to allow design products by the end customers. It is used in conjunction with Printful's product catalog and order API. The end customer can select a product, design it, and then order it. The following diagram illustrates the flow of the embedded designer integration:

Printful API
Shop
Embedded Designer
Displays Printful Product Catalog
Designs Product
Saves Design
Orders Product Template
Processes Order Request
The more detailed flow of the embedded designer integration is as follows:

Printful API
End Customer
Shop
Displays Printful Product Catalog
Retrieves Nonce Token via API
Embeds EDM JavaScript Component
Uses Nonce to Establish Single Use Session for EDM
Calls Printful API to Order Product Template
Selects Product to Design
Designs Product in Embedded Designer
Saves Design, Producing a Product Template
Orders Product Template
Handles Nonce Token Request
Processes Order Request
Marks Nonce as Used
Invalidates Token
Tutorials

Make your first order through the API

API Flow Overview

Here's a quick visual overview of how your system communicates with Printful's API during the order creation flow:

Authentication setup OAuth integration flow Order creation and fulfillment Webhook handling Product management

Entity Relationship Reference

The following diagram shows key API entities:

Entity relationship diagram

Introduction

In this tutorial, we're going to show you how to start making orders through the Printful API. You will learn to send postcards to friends or customers through the API, and select new images or addresses for every order.

You'll be able to take the lessons learned here and start making orders for any kind of product for your customers.

Set up

Before anything else make sure you have created a native or "manual order platform store" if you haven't already.

Go to this link: https://www.printful.com/dashboard/store.
Click the "Create" button under "Manual order platform/API"
Choose a name and click continue
As well as this you will need to create an OAuth token for this store.

Go to the developer portal: https://developers.printful.com/login
Sign in with your Printful account
Go to this link: https://developers.printful.com/tokens/add-new-token
Make sure you have set the access level to "A single store" and select your store
Make sure you have the following scopes selected for this tutorial:
orders ("View and manage orders of the authorized store")
Fill in all other fields as you please
Create your token
You will receive an access key, you will only see the token once, store it securely
To double-check that your token works, and that you have the right store selected, try running the following command replacing {your_token} with the access token created in the developer portal.

curl --location --request GET 'https://api.printful.com/stores' \
--header 'Authorization: Bearer {your_token}'
You should see your store in the response. If you don't see the right store there, or you get an error, double-check the token is correct and if necessary create a new token

Making an order

Before starting let's figure out what we need to make an order through the Printful API.

According to the docs there are only two fields in the create orders request that are absolutely required, the recipient object and the items array. So let's focus on those for now.

The recipient

Let's start with the recipient, this will depend on the location you want to send it to. Mine will look like this:

{
"name": "recipients name",
"address1": "12 address avenue, Bankstown",
"city": "Sydney",
"state_code": "NSW",
"country_code": "AU",
"zip": "2200"
}
Not all state and country codes are accepted by Printful, so I double-check to make sure that AU and NSW are accepted by running this curl command:

curl --location --request GET 'https://api.printful.com/countries' \
--header 'Authorization: Bearer {your_token}'
{
"code": 200,
"result": [
{
"name": "Australia",
"code": "AU",
"states": [
...,
{
"code": "NSW",
"name": "New South Wales"
},
...
]
}
],
"extra": []
}
Sure enough, both codes are there.

Note: If your recipient isn't in the US, Australia, or Canada the state code is not necessary. Read more.

The items

We only want one item, but first, we have to find the variant_id of that item.

Let's first see if we can find a category that might have postcards in it, with this command:

curl --location --request GET 'https://api.printful.com/categories' \
--header 'Authorization: Bearer {your_token}'
Thankfully there's a postcard category.

{
"code": 200,
"result": [
...,
{
"id": 197,
"parent_id": 190,
"image_url": "https://s3-printful.stage.printful.dev/upload/catalog_category/da/da6caac995335b87ace2d79af70eef5f_t?v=1652883254",
"title": "Postcards"
},
...
],
"extra": []
}
Now let's see what options there are in that category

curl --location --request GET 'https://api.printful.com/products?category_id=197' \
--header 'Authorization: Bearer {your_token}'
{
"id": 433,
"main_category_id": 197,
"type": "POSTCARD",
"type_name": "Standard Postcard",
"title": "Standard Postcard",
"brand": null,
"model": "Standard Postcard",
"image": "https://s3-printful.stage.printful.dev/products/433/product_1602054891.jpg",
"variant_count": 1,
"currency": "USD",
"options": [],
"dimensions": null,
"is_discontinued": false,
"avg_fulfillment_time": null,
"techniques": [
{
"key": "DIGITAL",
"display_name": "Digital printing",
"is_default": true
}
],
"files": [
{
"id": "default",
"type": "default",
"title": "Print file",
"additional_price": null
},
{
"id": "preview",
"type": "mockup",
"title": "Mockup",
"additional_price": null
}
],
"description": "These postcards are made from thick high-quality matte paper, so they serve as a great addition to a gift or just a thoughtful written note to a friend.\n• Cardboard paper\n• Paper weight: 7.67–10.32 oz/yd² (260–350 g/m²)\n• Size: 4″ × 6″ (101 × 152 mm)\n• Paper thickness: 0.013″ (0.34 mm)\n• Coated outer surface\n• Blank product materials sourced from Sweden, US, Brazil, or China",
"catalog_categories": {
"0": 197,
"1": 5,
"2": 122,
"4": 213,
"5": 230,
"6": 242
}
}
The standard option looks good so let's get some more information about the product with:

curl --location --request GET 'https://api.printful.com/products/433' \
--header 'Authorization: Bearer {your_token}'
{
"code": 200,
"result": {
"product": {
...
},
"variants": [
{
"id": 11513,
"product_id": 433,
"name": "Standard Postcards (4″×6″)",
"size": "4″×6″",
"color": null,
"color_code": null,
"color_code2": null,
"image": "https://s3-printful.stage.printful.dev/products/433/11513_1592384192.jpg",
"price": "1.50",
"in_stock": true,
"availability_regions": {
"US": "United States",
"EU": "Europe",
"EU_LV": "Latvia",
"AU": "Australia"
},
"availability_status": [
{
"region": "US",
"status": "in_stock"
},
{
"region": "EU",
"status": "in_stock"
},
{
"region": "EU_LV",
"status": "in_stock"
},
{
"region": "AU",
"status": "in_stock"
}
]
}
]
},
"extra": []
}
Our choice here should be easy, there is only one variant, and it's available in the region we need to send it to.

Now we can add this id (11513) to an item in our order payload.

{
...,
"items": [
{
"variant_id": 11513
}
]
}
Next, we need to add a files array to the item and decide on the "quantity" we want to print (let's just print 1 for now). This way Printful knows what to print, and how many items should be sent to the recipient.

{
"variant_id": 11513,
"quantity": 1,
"files": [
{
"url": "http://example.com/files/posters/poster_1.jpg"
}
]
}
Putting it all together

Now we can finish our orders payload and create our first order. The final payload should look like this:

{
"recipient": {
"name": "recipients name",
"address1": "12 address avenue, Bankstown",
"city": "Sydney",
"state_code": "NSW",
"country_code": "AU",
"zip": "2200"
},
"items": [
{
"variant_id": 11513,
"quantity": 1,
"files": [
{
"url": "http://example.com/files/posters/poster_1.jpg"
}
]
}
]
}
We can now make a POST request to https://api.printful.com/orders with this payload, and we'll get a draft order using a request like this:

curl --location --request POST 'https://api.printful.com/orders' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {your_token}' \
--data-raw '{
"recipient": {
"name": "recipients name",
"address1": "12 address avenue, Bankstown",
"city": "Sydney",
"state_code": "NSW",
"country_code": "AU",
"zip": "2200"
},
"items": [
{
"variant_id": 11513,
"quantity": 1,
"files": [
{
"url": "http://example.com/files/posters/poster_1.jpg"
}
]
}
]
}'
Now your order is ready to be made, you will even be able to see the draft already in your dashboard here: https://www.printful.com/dashboard/default/orders

Confirming an order

To confirm the order we need the id of our new order, it should have been returned by the response to the request above. If you've lost it, you can find it again by making a GET request to https://www.api.printful.com/orders and find your order in the returned list.

curl --location --request GET 'https://api.printful.com/orders' \
--header 'Authorization: Bearer {your_token}'
Assuming you haven't made any other orders it will probably be the first item returned in that list.

Once you have your order id you can confirm the order and have it sent to fulfillment.

Note: If you do want the order to be fulfilled remember to set up billing. If billing is not set up first the order will fail.

Warning: Do not run the following command if you do not want to be charged for this order.

curl --location --request POST 'https://api.printful.com/orders/{your_order_id}/confirm' \
--header 'Authorization: Bearer {your_token}' \
Automatically confirming new orders

Now I want to be able to send these postcards in one step, without needing to confirm every time.

To do that, all I have to do is add confirm=1 as a query parameter to the POST request. So that the request looks like this: POST https://api.printful.com/orders?confirm=1

Now, whenever I need to send a postcard with a new image I just change the item file URL in this request:

Warning: Do not run the following command if you do not want to be charged for this order.

curl --location --request POST 'https://api.printful.com/orders?confirm=1' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {your_token}' \
--data-raw '{
"recipient": {
"name": "recipient name",
"address1": "12 address avenue, Bankstown",
"city": "Sydney",
"state_code": "NSW",
"country_code": "AU",
"zip": "2200"
},
"items": [
{
"variant_id": 11513,
"quantity": 1,
"files": [
{
"url": "{change_this_url}"
}
]
}
]
}'
If I then wanted to send it to someone else all I'd need to do is change the address object.

Next steps

Try making some more draft requests like this for different items, and see how they look in the dashboard. Try moving the requests into an application you've already created so that your customers can make orders through a UI.

If you'd like to sell your own products that you've pre-built for your store you can follow our tutorial on creating products for your store through the API.
Creating products for your store through the API

Set up

To follow along with this tutorial, you will need to do the following:

Make sure you have created a native or "manual order platform store" if you haven't already.

Go to this link: https://www.printful.com/dashboard/store.
Click the "Create" button under "Manual order platform/API"
Choose a name and click continue
As well as this you will need to create an OAuth token for this store.

Go to the developer portal: https://developers.printful.com/login
Sign in with your Printful account
Go to this link: https://developers.printful.com/tokens/add-new-token
Make sure you have set the access level to "A single store" and select your store
Make sure you have the following scopes selected:
orders View and manage orders of the authorized store
sync_products View and manage store products
Fill in all other fields as you please
Create your token
You will receive an access token, you will only see the token once, store it securely
To double-check that your token works, and that you have the right store selected, try running the following command replacing {your_token} with the access token created in the developer portal.

curl --location --request GET 'https://api.printful.com/stores' \
--header 'Authorization: Bearer {your_token}'
You should see your store there. If you don't see the right store there, or you get an error, double-check the token is correct and if necessary create a new token

Get Sync Products

I've created a new store, "My Photos Store", and I want to start selling landscapes.

The first thing I want to do is see what products I have in my store. To do this I will use the Products API, which lets me create, modify and delete products in my Printful store.

So I make this request with curl.

curl --location --request GET 'https://api.printful.com/store/products' \
--header 'Authorization: Bearer {your_token}'
And it looks like I have no products in my store yet.

Note: If you've already created some products you'll see them here.

{
"code": 200,
"result": [],
"extra": [],
"paging": {
"total": 0,
"offset": 0,
"limit": 20
}
}
To create a new product for our store we'll need to make a post request to that same endpoint.

According to the docs, there are two required fields, an object sync_product and an array sync_variants.

The product only has one required field, name, and the variants only require the id and files fields to be present.

So to make a simple first product, let's try and build an object like this:

{
"sync_product": {
"name": "string"
},
"sync_variants": [
{
"variant_id": 1,
"files": [
{
"url": "string"
}
]
}
]
}
Our first step is to figure out the variant_ids that we need.

The Printful catalog

My main goal is to sell landscape photos, so let's check the Get Categories endpoint to see if there's anything suitable for that.

curl --location --request GET 'https://api.printful.com/categories' \
--header 'Authorization: Bearer {your_token}'
{
"code": 200,
"result": {
"categories": [
...
{
"id": 55,
"parent_id": 21,
"image_url": "https://s3-printful.stage.printful.dev/upload/catalog_category/6f/6f2f0c50f2558af01e4f8eebbc09a66d_t?v=1652883254",
"title": "Posters"
},
{
"id": 56,
"parent_id": 21,
"image_url": "https://s3-printful.stage.printful.dev/upload/catalog_category/34/347883396e6a71fdb25121f20c85e2b3_t?v=1652883254",
"title": "Framed posters"
},
{
"id": 57,
"parent_id": 21,
"image_url": "https://s3-printful.stage.printful.dev/upload/catalog_category/7c/7c2dd885646f3971b7199ac833a0232f_t?v=1652883254",
"title": "Canvas prints"
},
...
]
},
"extra": []
}
Posters, Framed Posters and Canvas prints all sound suitable. Though I'd prefer my photos framed before sending them to customers, so I will look into the category with id 56.

See if you can find a product that suits your needs best from the list returned from the /categories endpoint.

To see all options for framed posters let's use the category_id (56) with the Get Products endpoint.

We can pass the id of the category we're interested in as a query parameter, so I'll pass 56 in as a parameter with a request:

curl --location --request GET 'https://api.printful.com/products?category_id=56' \
--header 'Authorization: Bearer {your_token}'
This returns 4 products in an array:

{
"code": 200,
"result": [
{
"id": 2,
"main_category_id": 56,
"title": "Enhanced Matte Paper Framed Poster (in)",
...
},
{
"id": 304,
"main_category_id": 56,
"title": "Enhanced Matte Paper Framed Poster (cm)",
...
},
{
"id": 366,
"main_category_id": 56,
"title": "Framed Poster with Frame Mat (cm)",
...
},
{
"id": 172,
"main_category_id": 56,
"title": "Premium Luster Photo Paper Framed Poster (in)",
...
}
],
"extra": []
}
This will give us a lot of information about the products, but all we really need at this point is the id.

I'm interested in that "Premium Luster Photo Paper Framed Poster (in)" product, so to find what variants are available to me, I'll search for it by its id (172) and find the variant_ids I'm looking for.

curl --location --request GET 'https://api.printful.com/products/172' \
--header 'Authorization: Bearer {your_token}'
{
"code": 200,
"result": {
"product": {
"id": 172,
"main_category_id": 56,
"type": "FRAMED-POSTER",
"type_name": "Premium Luster Photo Paper Framed Poster (in)",
"title": "Premium Luster Photo Paper Framed Poster (in)",
...
},
"variants": [
...,
{
"id": 10760,
"product_id": 172,
"name": "Premium Luster Photo Paper Framed Poster (White/8″×10″)",
"size": "8″×10″",
"color": "White",
"color_code": "#ffffff",
"color_code2": null,
"image": "https://s3-printful.stage.printful.dev/products/172/10760_1565081295.jpg",
"price": "23.00",
"in_stock": true,
"availability_regions": {
"US": "United States",
"EU": "Europe",
"EU_LV": "Latvia",
"AU": "Australia",
"UK": "United Kingdom"
},
"availability_status": [
{
"region": "US",
"status": "in_stock"
},
{
"region": "EU",
"status": "in_stock"
},
{
"region": "EU_LV",
"status": "in_stock"
},
{
"region": "AU",
"status": "in_stock"
},
{
"region": "UK",
"status": "in_stock"
}
]
}
]
},
"extra": []
}
The final variant with id 10760 is in stock in all the regions I want to sell in and a small 8x10 sounds like a great first product for my store.

Your first sync product and sync variant

Now we can finish this payload from before:

{
"sync_product": {
"name": "string"
},
"sync_variants": [
{
"variant_id": 1,
"files": [
{
"url": "string"
}
]
}
]
}
I'll name my product "Framed Landscape Poster" so my object will look like this:

{
"sync_product": {
"name": "Framed Landscape Poster"
},
"sync_variants": [
{
"variant_id": 10760,
"files": [
{
"url": "http://example.com/files/posters/poster_1.jpg"
}
]
}
]
}
So let's post that object to the Products endpoint:

curl --location --request POST 'https://api.printful.com/store/products' \
--header 'Authorization: Bearer {your_token}' \
--header 'Content-Type: application/json' \
--data-raw '{
"sync_product": {
"name": "Framed Landscape Poster"
},
"sync_variants": [
{
"variant_id": 10760,
"files": [
{
"url": "http://example.com/files/posters/poster_1.jpg"
}
]
}
]
}'
And now we'll get our product back looking like this:

{
"code": 200,
"result": {
"id": 280896090,
"external_id": "6308d1498007d7",
"name": "Framed Landscape Poster",
"variants": 1,
"synced": 1,
"thumbnail_url": null,
"is_ignored": false
},
"extra": []
}
And when I go back to see the products in my store

curl --location --request GET 'https://api.printful.com/store/products' \
--header 'Authorization: Bearer {your_token}'
I see the new product:

{
"code": 200,
"result": [
{
"id": 280896090,
"external_id": "6308d1498007d7",
"name": "Framed Landscape Poster",
"variants": 1,
"synced": 1,
"thumbnail_url": null,
"is_ignored": false
}
],
"extra": [],
"paging": {
"total": 1,
"offset": 0,
"limit": 20
}
}
And I can see more details about the product with this request now.

Note: Replace the {your_product_id} at the end with the id of your sync product, i.e.

curl --location --request GET 'https://api.printful.com/store/products/{your_product_id}' \
--header 'Authorization: Bearer {your_token}'
For me, the request will look like this, but you will have a different id:

curl --location --request GET 'https://api.printful.com/store/products/280896090' \
--header 'Authorization: Bearer {your_token}'
{
"code": 200,
"result": {
"sync_product": {
"id": 280896090,
"external_id": "6308d1498007d7",
"name": "Framed Landscape Poster",
"variants": 1,
"synced": 1,
"thumbnail_url": null,
"is_ignored": false
},
"sync_variants": [
{
"id": 3374445206,
"external_id": "6308d14981f197",
"sync_product_id": 280896090,
"name": "Framed Landscape Poster - Black / 10″×10″",
"synced": true,
"variant_id": 6883,
"warehouse_product_id": null,
"warehouse_product_variant_id": null,
"retail_price": null,
"sku": null,
"currency": "USD",
"product": {
"variant_id": 6883,
"product_id": 172,
"image": "https://s3-printful.stage.printful.dev/products/172/6883_1527683114.jpg",
"name": "Premium Luster Photo Paper Framed Poster (Black/10″×10″)"
},
"files": [
{
"id": 450621845,
"type": "default",
"hash": null,
"url": "http://example.com/files/posters/poster_1.jpg",
"filename": null,
"mime_type": null,
"size": 0,
"width": null,
"height": null,
"dpi": null,
"status": "waiting",
"created": 1661516795,
"thumbnail_url": null,
"preview_url": null,
"visible": true
}
],
"options": [],
"is_ignored": false
}
]
},
"extra": []
}
Ordering the new product

Now that I have the product in my store, I can very easily order one of my sync variants as an item using only the sync_variant_id.

The payload might look something like this

{
"recipient": {
"name": "name",
"address1": "address",
"city": "city",
"state_code": "STATE_CODE",
"country_code": "COUNTRY_CODE",
"zip": "2200"
},
"items": [
{
"sync_variant_id": 3374445206,
"quantity": 1,
}
]
}
We can make a draft order with this command:

Note: You will need to swap {your_sync_variant_id} out with your own sync_variant_id

curl --location --request POST 'https://api.printful.com/orders' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {your_token}' \
--data-raw '{
"recipient": {
"name": "name",
"address1": "address",
"city": "city",
"state_code": "NSW",
"country_code": "AU",
"zip": "2200"
},
"items": [
{
"sync_variant_id": {your_sync_variant_id},
"quantity": 1
}
]
}
'
Next steps

To learn more about making an order see: Make your first order through the API.
Ordering a Direct to Garment (DTG) and an Embroidery Product through the API

Introduction

In this tutorial, we're going to make an order and design one of Printful's most popular items, the Unisex Staple T-Shirt | Bella + Canvas 3001. You will learn how to define file placements and product options when ordering DTG and embroidery products.

Set up

Before anything else make sure you have created a native or "manual order platform store" if you haven't already.

Go to this link: https://www.printful.com/dashboard/store
Click the "Create" button under "Manual order platform/API"
Choose a name and click continue
As well as this you will need to create an OAuth token for this store.

Go to the developer portal: https://developers.printful.com/login
Sign in with your Printful account
Go to this link: https://developers.printful.com/tokens/add-new-token
Make sure you have set the access level to "A single store" and select your store
Make sure you have the following scopes selected for this tutorial:
orders ("View and manage orders of the authorized store")
Fill in all other fields as you please
Create your token
You will receive an access key, you will only see the token once, store it securely
To double-check that your token works and that you have the right store selected, try running the following command replacing your_token with the access token created in the developer portal.

curl --location --request GET 'https://api.printful.com/stores' \
--header 'Authorization: Bearer {your_token}'
You should see your store in the response. If you don't see the right store there, or you get an error, double-check the token is correct and if necessary create a new token.

Making the order

We won't go through all the details on how to make an order in this tutorial, instead we will start with the following JSON object, which we can use as the basis for constructing an order.

{
"recipient": {
"name": "recipients name",
"address1": "12 address avenue, Bankstown",
"city": "Sydney",
"state_code": "NSW",
"country_code": "AU",
"zip": "2200"
},
"items": [
{
"variant_id": 4035,
"quantity": 1
}
]
}
The recipient object describes where, and to whom, I want to send the order. Inside the items array I have one object with variant_id 4035 which is this T-Shirt:

variant_id 4035
Described in JSON like this:

{
"id": 4035,
"product_id": 71,
"name": "Bella + Canvas 3001 Unisex Short Sleeve Jersey T-Shirt with Tear Away Label (Asphalt / 2XL)",
"size": "2XL",
"color": "Asphalt",
"color_code": "#52514f",
"color_code2": null,
"image": "https://s3-printful.stage.printful.dev/products/71/4035_1581408351.jpg",
"price": "12.55",
"in_stock": true,
"availability_regions": {
"US": "United States",
"EU": "Europe",
"EU_LV": "Latvia",
"EU_ES": "Spain",
"AU": "Australia",
"CA": "Canada",
"UK": "United Kingdom"
},
"availability_status": [
{
"region": "US",
"status": "in_stock"
},
{
"region": "EU",
"status": "in_stock"
},
{
"region": "EU_LV",
"status": "in_stock"
},
{
"region": "EU_ES",
"status": "stocked_on_demand"
},
{
"region": "AU",
"status": "in_stock"
},
{
"region": "CA",
"status": "in_stock"
},
{
"region": "UK",
"status": "in_stock"
}
]
}
If you'd like more detail, we have a tutorial to help you make your first order through the API.

Adding placements

We already know what we want to order. But now we want to add our design to the image. I want to print the following design on the right sleeve and the back of the T-Shirt.

Printful logo

First let's make sure that's actually possible, by making a request to the variants endpoint.

curl --location --request GET 'https://api.printful.com/products/variant/4035' \
--header 'Authorization: Bearer {your_token}'
Note: You could also do this with a request to the Products endpoint as this information will be the same for each variant of a product.

curl --location --request GET 'https://api.printful.com/products/71' \
--header 'Authorization: Bearer {your_token}'
You will see what file placements are available under result.product.files. As of writing this tutorial the following placements are available:

...
"files": [
{
"id": "embroidery_chest_left",
"type": "embroidery_chest_left",
"title": "Left chest",
"additional_price": "2.60"
},
{
"id": "embroidery_large_center",
"type": "embroidery_large_center",
"title": "Large center",
"additional_price": "3.25"
},
{
"id": "embroidery_chest_center",
"type": "embroidery_chest_center",
"title": "Center chest",
"additional_price": "2.60"
},
{
"id": "embroidery_sleeve_left_top",
"type": "embroidery_sleeve_left_top",
"title": "Left sleeve top",
"additional_price": "2.60"
},
{
"id": "embroidery_sleeve_right_top",
"type": "embroidery_sleeve_right_top",
"title": "Right sleeve top",
"additional_price": "2.60"
},
{
"id": "default",
"type": "front",
"title": "Front print",
"additional_price": null
},
{
"id": "front_large",
"type": "front_large",
"title": "Large front print",
"additional_price": "5.25"
},
{
"id": "back",
"type": "back",
"title": "Back print",
"additional_price": "5.25"
},
{
"id": "label_outside",
"type": "label_outside",
"title": "Outside label",
"additional_price": "2.20"
},
{
"id": "label_inside",
"type": "label_inside",
"title": "Inside label",
"additional_price": "2.20"
},
{
"id": "sleeve_left",
"type": "sleeve_left",
"title": "Left sleeve",
"additional_price": "2.20"
},
{
"id": "sleeve_right",
"type": "sleeve_right",
"title": "Right sleeve",
"additional_price": "2.20"
},
{
"id": "preview",
"type": "mockup",
"title": "Mockup",
"additional_price": null
}
],
...
Thankfully "Right sleeve" (sleeve_right) and "Back print" (back) are among the available options for this product.

...
{
"id": "back",
"type": "back",
"title": "Back print",
"additional_price": "5.25"
},
...
{
"id": "sleeve_right",
"type": "sleeve_right",
"title": "Right sleeve",
"additional_price": "2.20"
},
...
The most important thing here is the type field, that's what we will use to indicate where we want our files to be placed.

Adding the image placements to the items

Now we can add our designs to the item object. To do that we need a files array containing the source of our images.

In our previous article on making orders, we already added a file to an item, and it looked like this:

{
"variant_id": 4035,
"quantity": 1,
"files": [
{
"url": "https://printful.com/static/images/layout/logo-printful.png"
}
]
}
This won't work for us though, because it doesn't specify the placement. The above payload will use the default placement because no other was specified. If we use the default the image will be printed on the front for this product.

To have the placement on the back instead, let's add a type field to the file object

{
"type": "back",
"url": "https://printful.com/static/images/layout/logo-printful.png"
}
Then we can add another object to the files array doing the same but with sleeve_right as the type so that our final item looks like this.

{
"variant_id": 4035,
"quantity": 1,
"files": [
{
"type": "back",
"url": "https://printful.com/static/images/layout/logo-printful.png"
},
{
"type": "sleeve_right",
"url": "https://printful.com/static/images/layout/logo-printful.png"
}
]
}
Ordering the product

We can already make our order as a draft with this request:

curl --location --request POST 'https://api.printful.com/orders' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {your_token}' \
--data-raw '{
"recipient": {
"name": "recipients name",
"address1": "12 address avenue, Bankstown",
"city": "Sydney",
"state_code": "NSW",
"country_code": "AU",
"zip": "2200"
},
"items": [
{
"variant_id": 4035,
"quantity": 1,
"files": [
{
"type": "back",
"url": "https://printful.com/static/images/layout/logo-printful.png"
},
{
"type": "sleeve_right",
"url": "https://printful.com/static/images/layout/logo-printful.png"
}
]
}
]
}'
In the response, you'll find a link to the order in the dashboard.

...
"dashboard_url": "https://www.printful.com/dashboard?order_id={your_order_id}"
...
In the dashboard, you'll be able to view the order and see how your item looks on a mockup. You may have to wait for the mockup to be generated.

Note: This can be done programmatically through the API as well, using the Mockup Generator API.

File position

The print file on the back placement didn't look how I expected. I wanted the image towards the top and the middle. So, I will update the order and pass a position object along with the item using a PUT request to the orders endpoint.

The position object looks like this:

{
"area_width": 1200,
"area_height": 1600,
"width": 300,
"height": 100,
"top": 100,
"left": 450
}
This object creates an invisible background for your image, which you can use to place your image in a more specific location. area_width and area_height are used to create the area your image will be placed on top of. width and height can be used to resize your image. top and left refer to how far away the image should be placed from the top and left respectively.

These numbers are relative and don't refer to centimeters, inches, or pixels. So the following placement object is the same as the previous one:

{
"area_width": 12,
"area_height": 16,
"width": 3,
"height": 1,
"top": 1,
"left": 4.5
}
This is the request I make to update the order:

curl --location --request PUT 'https://api.printful.com/orders/{your_order_id}' \
--header 'Authorization: Bearer {your_token}' \
--header 'Content-Type: application/json' \
--data-raw '{
"items": [
{
"variant_id": 4035,
"quantity": 1,
"files": [
{
"type": "back",
"url": "https://printful.com/static/images/layout/logo-printful.png",
"position": {
"area_width": 1200,
"area_height": 1600,
"width": 300,
"height": 100,
"top": 100,
"left": 450
}
},
{
"type": "sleeve_right",
"url": "https://printful.com/static/images/layout/logo-printful.png"
}
]
}
]
}'
Adding embroidery

Now that I have an order with direct to garment prints made, I'd also like to have my design embroidered.

For the embroidered version of the T-Shirt I'd like the design to be on the chest towards the left, where a pocket might be on another shirt. Thankfully, we've already seen that top left is an option for this shirt

{
"id": "embroidery_chest_left",
"type": "embroidery_chest_left",
"title": "Left chest",
"additional_price": "2.60"
}
So let's try and make our previous POST request again, but this time with only the embroidery_chest_left file type:

curl --location --request POST 'https://api.printful.com/orders' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {your_token}' \
--data-raw '{
"recipient": {
"name": "recipients name",
"address1": "12 address avenue, Bankstown",
"city": "Sydney",
"state_code": "NSW",
"country_code": "AU",
"zip": "2200"
},
"items": [
{
"variant_id": 4035,
"quantity": 1,
"files": [
{
"type": "embroidery_chest_left",
"url": "https://printful.com/static/images/layout/logo-printful.png"
}
]
}
]
}'
Unfortunately, embroidery items work a bit differently, so if we make that request we'll get this error:

{
"code": 400,
"result": "Item 0: thread_colors_chest_left option is missing or incorrect! Allowed values: #FFFFFF, #000000, #96A1A8, #A67843, #FFCC00, #E25C27, #CC3366, #CC3333, #660000, #333366, #005397, #3399FF, #6B5294, #01784E, #7BA35A",
"error": {
"reason": "BadRequest",
"message": "Item 0: thread_colors_chest_left option is missing or incorrect! Allowed values: #FFFFFF, #000000, #96A1A8, #A67843, #FFCC00, #E25C27, #CC3366, #CC3333, #660000, #333366, #005397, #3399FF, #6B5294, #01784E, #7BA35A"
}
}
There are only so many colors available when using embroidery, so the thread_colors need to be set in the request. If you don't want to do that manually you can pass the auto_thread_color into the files options array.

"type": "embroidery_chest_left",
"url": "https://printful.com/static/images/layout/logo-printful.png"
"options": [
{
"id": "auto_thread_color",
"value": true
}
]
Note: The options are a property of the file object not the item

If that option is passed into the request, Printful will choose the colors closest to those in the file.

However, in this case, I'd like more control over the thread colors. I'd like a black and white effect, so I need to add the option thread_colors_chest_left to the item along with the first two allowed values from the error message.

{
"variant_id": 4035,
"quantity": 1,
"files": [
{
"type": "embroidery_chest_left",
"url": "https://printful.com/static/images/layout/logo-printful.png"
}
],
"options": [
{
"id": "thread_colors_chest_left",
"value": ["#000000", "#FFFFFF"]
}
]
}
Note: The options are a property of the item object not of the file.

Now to make that order we can make a request like this:

curl --location --request POST 'https://api.printful.com/orders' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {your_token}' \
--data-raw '{
"recipient": {
"name": "recipients name",
"address1": "12 address avenue, Bankstown",
"city": "Sydney",
"state_code": "NSW",
"country_code": "AU",
"zip": "2200"
},
"items": [
{
"variant_id": 4035,
"quantity": 1,
"files": [
{
"type": "embroidery_chest_left",
"url": "https://printful.com/static/images/layout/logo-printful.png"
}
],
"options": [
{
"id": "thread_colors_chest_left",
"value": ["#000000", "#FFFFFF"]
}
]
}
]
}'
Next steps

We've made these orders, but we haven't confirmed them yet, so they are just drafts. For more information on making orders, you can look through the documentation here or follow our other tutorial Make your first order through the API.

Or if you would like these items to be more reusable as items in your store you can follow our tutorial on creating products for your store through the API.
Creating Mockups in the API

Introduction

In our previous tutorials we created products that can be ordered by ourselves or our customers. However, if we're going to order a product, or offer it to a customer, we'll want to know what it looks like first. That's where mockups come in.

In this tutorial, we're going to create mockups for some of the products we built in previous tutorials.

Set up

Before anything else make sure you have created a native or "manual order platform store" if you haven't already.

Go to this link: https://www.printful.com/dashboard/store
Click the "Create" button under "Manual order platform/API"
Choose a name and click create
As well as this you will need to create an OAuth token for this store.

Go to the developer portal: https://developers.printful.com/login
Sign in with your Printful account
Go to this link: https://developers.printful.com/tokens/add-new-token
Make sure you have set access level to "A single store" and select your store
Make sure you have the following scopes selected for this tutorial:
orders ("View and manage orders of the authorized store")
Fill in all other fields as you please
Create your token
You will receive an access key, you will only see the token once, store it securely
Deciding which variants to generate

In one of our previous tutorials, Ordering a Direct to Garment (DTG) and an Embroidery Product through the API. Let's make some mockups for that same T-Shirt.

When we originally made the T-Shirt, we only had the Asphalt color, but I'd also like to display a Black and White variant as well. So, I find the id of the T-Shirt product I want, 71, and make a GET request to https://api.printful.com/products/71.

curl --location --request GET 'https://api.printful.com/products/71' \
--header 'Authorization: Bearer {your_token}'
This will provide you with, among other things, a list of variants. Among those variants, you will find the Asphalt variant 4035 we created in the previous tutorial. We will also find a variant with the color black 4020 and a variant with the color white 4015.

Now we need to get the files from our previous tutorial and put them into a new files array using the format of the Mockup Generator API.

So if we had files from an order that looked like this:

"files": [
{
"type": "embroidery_chest_left",
"url": "https://printful.com/static/images/layout/logo-printful.png"
"position": {
"area_width": 1800,
"area_height": 2400,
"width": 1800,
"height": 1800,
"top": 300,
"left": 0
}
}
]
Our new files array will look like this:

"files": [
{
"type": "embroidery_chest_left",
"image_url": "https://printful.com/static/images/layout/logo-printful.png",
"position": {
"area_width": 1800,
"area_height": 2400,
"width": 1800,
"height": 1800,
"top": 300,
"left": 0
}
}
]
To generate the mockups for these variants we can put these files and variant_ids in a single POST request to https://api.printful.com/mockup-generator/create-task/{product_id}.

curl --location --request POST 'https://api.printful.com/mockup-generator/create-task/71' \
--header 'Authorization: Bearer {your_token}' \
--header 'Content-Type: application/json' \
--data-raw '{
"variant_ids": [
4035,
4020,
4015
],
"files": [
{
"type": "embroidery_chest_left",
"image_url": "https://printful.com/static/images/layout/logo-printful.png",
"position": {
"area_width": 1800,
"area_height": 2400,
"width": 1800,
"height": 1800,
"top": 300,
"left": 0
}
}
]
}'
This will give you a response like this:

{
"code" : 200,
"extra" : [],
"result" : {
"status" : "pending",
"task_key" : "gt-421699980"
}
}
You'll notice that there are no mockups in the response, instead, you receive a task_key which you can use to retrieve the actual mockup:

curl --location --request GET 'https://api.printful.com/mockup-generator/task?task_key=gt-421699980' \
--header 'Authorization: Bearer {your_token}'
{
"code" : 200,
"extra" : [],
"result" : {
"mockups" : [
{
"extra" : [
{
"option" : "Front",
"option_group" : "Men's",
"title" : "Front",
"url" : "https://printful-upload.s3-accelerate.amazonaws.com/tmp/ca321525cfd907188c2266fb6a41cf94/unisex-staple-t-shirt-black-front-634d3ec02e655.png"
},
{
"option" : "Front",
"option_group" : "Flat",
"title" : "Front",
"url" : "https://printful-upload.s3-accelerate.amazonaws.com/tmp/a3560e3a7558374cfdb2bb6c53ccee18/unisex-staple-t-shirt-black-front-634d3ec02e945.png"
}
],
"mockup_url" : "https://printful-upload.s3-accelerate.amazonaws.com/tmp/e2a9e33986914a13096d60847be8a5b0/unisex-staple-t-shirt-black-zoomed-in-634d3ec02dafc.png",
"placement" : "embroidery_chest_left",
"variant_ids" : [
4020
]
},
{
...
"variant_ids" : [
4035
]
},
{
...
"variant_ids" : [
4015
]
}
],
"printfiles" : [
{
"placement" : "embroidery_chest_left",
"url" : "https://printful-upload.s3-accelerate.amazonaws.com/tmp/81aabb08df3df89bf67edbd0540fcbe1/printfile_embroidery_chest_left.png",
"variant_ids" : [
4020,
4035,
4015
]
}
],
"status" : "completed",
"task_key" : "gt-421709941"
}
}
And that's it, now we have three mockups for each variant, one is an image of the front of the T-Shirt with no model, and the other two are the front of the T-Shirt with a model.

The only problem is that these default mockups only give me one kind of model or style To change the style of my mockups I'll need to find the options and option_groups that will help create different mockup styles.

Options and Option Groups

What are options and option_groups?

In the context of mockup generation options, generally speaking, refer to the part of the product being displayed. option_groups refers to the "style" of the mockup. For example "Front" refers to an option but "Wrinkled" or "On Hanger" are option_groups.

Finding options and option_groups

To find what options and option_groups are available I make a request to mockup-generator/printfiles/{product_id}:

curl --location --request GET 'https://api.printful.com/mockup-generator/printfiles/71' \
--header 'Authorization: Bearer {your_token}'
Giving the following response:

{
"code" : 200,
"extra" : [],
"result" : {
"available_placements" : {
...
},
"option_groups" : [
"Couple's",
"Flat",
"Flat 2",
"Flat Lifestyle",
"Folded",
"Halloween",
"Holiday season",
"Men's",
"Men's 2",
"Men's 3",
"Men's 4",
"Men's 5",
"Men's Lifestyle",
"Men's Lifestyle 2",
"Men's Lifestyle 3",
"Men's Lifestyle 4",
"On Hanger",
"Product details",
"Red, white & blue",
"Spring/summer vibes",
"Valentine's Day",
"Women's",
"Women's 2",
"Women's 3",
"Women's 4",
"Women's 5",
"Women's Lifestyle",
"Women's Lifestyle 2",
"Women's Lifestyle 3",
"Wrinkled"
],
"options" : [
...
"Front",
...
],
"printfiles" : [
...
],
"product_id" : 71,
"variant_printfiles" : [
...
]
}
}
I'd like to have mockups for both genders, so I've already created "Men's" mockups. So, I can make the request again, specifying that I want the "Women's" option_group

curl --location --request POST 'https://api.printful.com/mockup-generator/create-task/71' \
--header 'Authorization: Bearer {your_token}' \
--header 'Content-Type: application/json' \
--data-raw '{
"variant_ids": [
4035,
4020,
4015
],
"files": [
{
"type": "embroidery_chest_left",
"image_url": "https://upload.wikimedia.org/wikipedia/commons/0/06/Ercole_de%27_roberti%2C_san_michele_arcangelo_louvre_01.jpg",
"position": {
"area_width": 1800,
"area_height": 2400,
"width": 1800,
"height": 1800,
"top": 300,
"left": 0
}
}
],
"options": ["Front"],
"option_groups": ["Women'\''s"]

}'
Repeating the steps from before, results in new mockups for each variant, but now with a different model.

If I also want to receive additional styles (option_groups) I just need to add it to the option groups. For example, these option groups will give me mockups for "Men's 2", "Women's" and "Couple's".

"option_groups": ["Men's 2", "Women's", "Couple's"]
Mismatched options

It is possible to add options or option_groups that don't produce any mockups.

For example, if I try and make the previous request with "options": ["Back"] I will receive a 400 error:

{
"code" : 400,
"error" : {
"message" : "No variants to generate. Option filters may exclude all variants or variants are not available. Alternatively, make sure that variants belong to given product id.",
"reason" : "BadRequest"
},
"result" : "No variants to generate. Option filters may exclude all variants or variants are not available. Alternatively, make sure that variants belong to given product id."
}
This is because all the print files are on the front, so Printful can't produce a mockup for the "Back".

But if our request had a print file on the back the request would succeed for. For example:

curl --location --request POST 'https://api.printful.com/mockup-generator/create-task/71' \
--header 'Authorization: Bearer {your_token}' \
--header 'Content-Type: application/json' \
--data-raw '{
"variant_ids": [
4035,
4020,
4015
],
"files": [
{
"type": "back",
"image_url": "https://upload.wikimedia.org/wikipedia/commons/0/06/Ercole_de%27_roberti%2C_san_michele_arcangelo_louvre_01.jpg",
"position": {
"area_width": 1800,
"area_height": 2400,
"width": 1800,
"height": 1800,
"top": 300,
"left": 0
}
}
],
"options": ["Back"],
"option_groups": ["Women'\''s"]

}'
Multiple options and option_groups

It is also possible to have multiple options. For example, assuming we have the right variants and print files, the following combination would produce mockups of the back and front of the product, for "Men's" "Women's".

"options": ["Front", "Back"],
"option_groups": ["Men's 2", "Women's"]
However, you should attempt to limit the number of options and option_groups you provide here as much as possible. Otherwise, you may get combinations that don't match resulting in unexpected results that you won't see until after generation.

The following request will not give 400, instead, it will produce the "Front" mockups and ignore the "Back" mockups.

curl --location --request POST 'https://api.printful.com/mockup-generator/create-task/71' \
--header 'Authorization: Bearer {your_token}' \
--header 'Content-Type: application/json' \
--data-raw '{
"variant_ids": [
...
],
"files": [
{
"type": "embroidery_chest_left",
...
}
],
"options": ["Front", "Back"],
"option_groups": ["Men'\''s 2", "Women'\''s"]
}'
Without the 400 message you may think you are producing mockups that are actually impossible to produce. If these requests are part of a larger system, it could mean that you end up promising mockups to your users that are actually impossible.

Additionally, mockup generation can be slow, each new option group will add new mockups multiplied by the amount of variants and options you have. In a user facing application generating too many mockups for users might be unacceptably slow.

It is usually safer to make multiple requests with limited than one large request that attempts to generate a large range of different mockups

Next Steps

Now that you've created a basic mockup try and create some mockups for your products. After that you can save the results somewhere on your server and use your new mockups however you like.

You could also update the thumbnail of one of your existing store products.

curl --location --request PUT 'https://api.printful.com/store/products/{sync_product_id}' \
--header 'Authorization: Bearer {your_token}' \
--data-raw '{
"sync_product": {
"thumbnail": "{url_of_your_new_mockup}"
}
}'
If you don't have any products in your store yet, check out our tutorial on that subject, Creating products for your store through the API. Make your first order through the API.
Integrating with ECommerce Platforms through the API

Introduction

In this tutorial, we will show you how to integrate with your ECommerce Sync Products through the API. We will retrieve our products, update sync variants, and send out notifications.

Suppose we have a new store that is selling a range of products with a design that changes every year, it could be for a conference or maybe for a holiday like Christmas. We have a very large range of products and at the moment our designers have to update all the products manually every year. We want to offer our designers a way to update all of these products at once through the API.

Set up

Before anything else make sure you have created a store using one of our integrations. You can choose a platform here: https://www.printful.com/dashboard/store/connect, and find additional tutorials to help you set it up.

As well as this you will need to create an OAuth token for this store.

Go to the developer portal: https://developers.printful.com/login
Sign in with your Printful account
Go to this link: https://developers.printful.com/tokens/add-new-token
Make sure you have set access level to "A single store" and select your store
Make sure you have the following scopes selected for this tutorial:
webhooks ("View and manage store webhooks")
sync_products ("View and manage store products")
Fill in all other fields as you please
Create your token
You will receive an access key, you will only see the token once, store it securely
Limitations

For the most part, the ECommerce API works just like the Products API, but there are a couple of important limitations. These limitations are explained here: https://developers.printful.com/docs/#tag/Ecommerce-Platform-Sync-API. But, for the purposes of this tutorial, the most important thing is that it’s not possible to create new sync products directly through the API.

Retrieving Products and Variants

First, let's find the products from last year's Christmas sale

curl --location --request GET 'https://api.printful.com/sync/products' \
--header 'Authorization: Bearer {your_token} \
{
"code": 200,
"result": [
{
"id": 290959495,
"external_id": "christmas_636b6f729a37c7",
"name": "Unisex t-shirt | Christmas",
"variants": 1,
"synced": 1,
"thumbnail_url": "https://files.cdn.printful.com/files/thumbnail/christmas.png",
"is_ignored": false
},
...
],
"extra": [],
"paging": {
"total": 143,
"offset": 0,
"limit": 20
}
}
Now we will need to loop through these products to find the variants.

curl --location --request GET 'https://api.printful.com/sync/products/{id} \
--header 'Authorization: Bearer {your_token} \
For that first product we might get a list of variants that looks like this

{
"code": 200,
"result": {
"sync_product": {
"id": 290959495,
"external_id": "636b6f729a37c7",
"name": "Unisex t-shirt | Christmas",
"variants": 1,
"synced": 1,
"thumbnail_url": "https://files.cdn.printful.com/files/6bf/6bfceb21e5fa7a854ff915ca66ca3a79_preview.png",
"is_ignored": false
},
"sync_variants": [
{
"id": 3590218032,
"external_id": "636b6f729a3867",
"sync_product_id": 290959495,
"name": "Unisex t-shirt | Christmas",
"synced": true,
"variant_id": 9575,
"main_category_id": 24,
"warehouse_product_id": 330125,
"warehouse_product_variant_id": 394380,
"retail_price": "37.25",
"sku": "636B6F729A302",
"currency": "EUR",
"product": {
"variant_id": 9575,
"product_id": 71,
"image": "https://s3-printful.stage.printful.dev/products/71/9575_1581408916.jpg",
"name": "Bella + Canvas 3001 Unisex Short Sleeve Jersey T-Shirt with Tear Away Label (Black Heather / XS)"
},
"files": [
{
"id": 490457488,
"type": "default",
"hash": null,
"url": "https://example.com/file_for_christmas_2022.jpg",
"filename": null,
"mime_type": null,
"size": 0,
"width": null,
"height": null,
"dpi": null,
"status": "ok",
"created": 1681472128,
"thumbnail_url": null,
"preview_url": null,
"visible": true,
"is_temporary": false
}
],

                ],
                "options": [
                    ...
                ],
                "is_ignored": false
            }
        ]
    },
    "extra": []
}
Updating a Sync Variant

As you can see from the request above the image is for 2022, https://example.com/file_for_christmas_2022.jpg, and we want to update so that we use the new 2023 image. For that all we need to do is send a PUT request to the endpoint

curl --location --request PUT 'https://api.printful.com/sync/variant/3590218032' \
--header 'Authorization: Bearer {your_token} \
--data '{
"files": [
{
"type": "default",
"url": "https://example.com/file_for_christmas_2023.jpg"
}
]
}'
This will replace the original 2022 files with the new 2023 files.

Now, rather than changing each product individually the designers could simply send you the new design, or use your custom UI. You will then be able to loop through all the relevant variants, replacing the old file for each variant.

Note when looping through anything within the API remember to keep within the rate limits

Setting Up a Webhook For Newly Synced Products

Webhooks are another opportunity for the automation of your ECommmerce website through the API. Suppose you want to inform your customers everytime your team creates a new Sync Product. This can be automated using webhooks.

First, you will need to listen for webhooks coming from Printful. We can’t help with setting up a server to do that, but you can use our webhook simulator.

The webhook you will be listening for is: product_synced. To configure the webhook make the following request

curl --location -X POST 'https://api.printful.com/webhooks' \
--header 'Authorization: Bearer {your_token} \
--data '{
"url": "https://your.site/path/to/webhook-listener",
"types": [
"product_synced"
]
}'
Now, whenever a new product is synced to Printful, Printful will POST to the new product to that endpoint in this format:

{
"type": "product_synced",
"created": 1681473307,
"retries": 1,
"store": {your_store_id},
"data": {
"sync_product": {
"id": 4567234,
"external_id": "christmas_collection-1234",
"name": "Mug | Christmas",
"variants": 1,
"synced": 1
}
}
}
Now, whenever you receive the webhook you can send updates to your customers about the new product that was just synced.

Next steps

After updating your products you may also want to generate mockups through the Mockup Generator API.

If you have a Native Store, you should check our tutorial on the Store Products API.
Errors

General errors

Code
Name
Explanation
401	UNAUTHORIZED	Indicates that the endpoint requires authentication
403	FORBBIDEN	Unauthorized requests. The client does not have access rights to the resource
404	NOT FOUND	The server cannot find the requested resource
405	METHOD NOT ALLOWED	The request HTTP method is known by the server but has been disabled and cannot be used for that resource
419	RATE LIMITED WARNING	Returned by the API when the client is being rate limited
429	TOO MANY REQUESTS	The user has sent too many requests in a given amount of time (rate limiting)
430	INVALID JSON	The user has sent an invalid JSON.
431	INVALID PARAMETER	The user has sent a parameter with the wrong type
API Errors

Products API

Code
Name
Explanation
PR-1	MISSING_VARIANT_ID	The required field variant_id must be present
PR-2	WAREHOUSE_VARIANT_NOT_AVAILABLE	The warehouse_variant_id provided in the sync_variant object is not available at the moment
PR-3	WAREHOUSE_VARIANT_NOT_APPROVED	The warehouse variant related to the provided warehouse_variant_id wasn't approved
PR-4	WAREHOUSE_PRODUCT_NOT_APPROVED	The warehouse product related to the provided warehouse_variant_id wasn't approved
PR-5	SYNC_PRODUCT_SOFT_DELETED	The sync_product related to the provided id doesn't have any sync_variants related. Please add at least one sync_variant
PR-6	INVALID_FILTER_STATUS	The provided status is not a valid filter. Must be one of the following: all, synced, unsynced, ignored, imported, discontinued, out_of_stock
Orders API

Code
Name
Explanation
OR-1	ORDER_NO_LONGER_EDITABLE	The order is no longer editable. To be editable via API must have one of the following statuses: DRAFT, FAILED
OR-2	STORE_TERMINATED	The store related to the account is terminated
OR-3	INCOMPATIBLE_ORDER_OPTIONS	The order cannot be confirmed and saved as a draft at the same time.
OR-4	INVALID_SHIPPING_METHOD	The shipping method selected for the order is invalid or not supported
OR-5	INVALID_ORDER_ITEM	The item provided is not an array
OR-6	RESTRICTED_VARIANT	The variant that you are trying to order is currently restricted
OR-7	INCOMPATIBLE_SYNC_VARIANT_ITEM	Associating Sync Variant with the existing item is not allowed
OR-8	INCOMPATIBLE_PRODUCT_TEMPLATE	Associating the Product Template with the existing item is not allowed
OR-9	LIMITED_SHIPPING_SERVICE	The product related to the provided product_id can be only ordered to the US territory
OR-10	UNSUPPORTED_FILE_TYPE	The file type provided is not supported via API
OR-11	MULTIPLE_LABEL_PRODUCT	Inside and outside labels can't be combined with each other on the same product
OR-12	DUPLICATED_FILE_TYPE	The provided item contains multiple files for placement
OR-13	EXTERNAL_ID_IN_USE	The external_id provided already exists and cannot be used
File Library API

Code
Name
Explanation
FL-1	INVALID_FILE_FORMAT	The URL provided returns a file with an invalid format
FL-2	INVALID_FILE_URL	The file URL provided is invalid
FL-3	UNKNOW_FILE_ID	The file ID provided was not found
FL-4	FILE_NOT_ACCESIBLE	The specified file does not belong to this store
FL-5	PRINT_FILE_PREVIEW	Temporary print file preview file cannot be used
FL-6	FILE_LICENSED_ASSETS	Print files with licensed assets cannot be used
FL-7	INVALID_FILE_DATA	Posted file data doesn't contain valid image data
FL-8	MISSING_URL_DATA	The fields url or data must be present in the request
FL-9	FAILED_FILE_THREAD_COLORS	The file image could not be processed
Shipping Rates API

Code
Name
Explanation
SH-1	INVALID_COUNTRY_CODE	The country_code provided is invalid or missing
SH-2	SHIPPING_DISABLED	This happens when the shipping is disabled to the country specified
SH-3	INVALID_CURRENCY_CODE	The currency_code provided is invalid or not supported
Ecommerce platform Sync API

Code
Name
Explanation
EC-1	INVALID_FILTER_STATUS	The provided status is not a valid filter. Must be one of the following: all, synced, unsynced, ignored, imported, discontinued, out_of_stock
EC-2	INVALID_PARAMETER_LENGTH	The search parameter should be at least 3 characters long
EC-3	INVALID_OPTIONS_ELEMENT	The options field is incorrect or invalid
EC-4	NON_LABEL_FILES_MISSING	Non-label files must be provided for this product
EC-5	UNSUPPORTED_INTEGRATION_SYNC	The integration of this store (store name) does not support syncing Printful items.
EC-6	JEWELRY_PRODUCTS_NOT_AVAILABLE	The jewelry products are not available with this endpoint.
Tax Rate API

Code
Name
Explanation
TR-1	MISSING_RECIPIENT	The recipient parameter must be present in the payload
TR-2	RECIPIENT_ERRORS	Related to the collected errors found in the recipient
Store Information API

Code
Name
Explanation
SI-1	INVALID_PACKING_SLIP	The data provided is invalid
Mockup Generator API

Code
Name
Explanation
MG-1	INVALID_ORIENTATION	Invalid orientation given
MG-2	INVALID_TECHNIQUE	Invalid technique given
MG-3	UNAVAILABLE_GENERATOR_PRODUCT	The mockup generator is not available for the product specified
MG-4	GENERATOR_PRODUCT	Related to general errors in the payload
MG-5	INVALID_FORMAT	The specified format is invalid
MG-6	INVALID_WIDTH	The specified width is invalid
MG-7	MISSING_REQUIRED_OPTION	Either file array or product_template_id should be present
MG-8	DAILY_ALLOWANCE_EXCEEDED	The daily file count allowance is exceeded
Examples

Catalog API examples

API Flow Overview

Here's a quick visual overview of how your system communicates with Printful's API during the order creation flow:

Authentication setup OAuth integration flow Order creation and fulfillment Webhook handling Product management

Entity Relationship Reference

The following diagram shows key API entities:

Entity relationship diagram
Filter products by single category ID

The IDs of the categories may be retrieved using the GET /categories endpoint. We're going to list products belonging to the "Samsung cases" category (ID: 62).

Request URL: https://api.printful.com/products?category_id=62

Response data
Filter products by multiple category IDs

The following request will fetch iPhone cases (ID: 50) and Samsung cases (ID: 62).

Request URL: https://api.printful.com/products?category_id=50,62

Response data
Using size guides

In this example, we'll fetch the size guides for the "Women's Basic Organic T-Shirt | SOL'S 02077" product (ID: 561).

We use the default en_US locale and don't provide the unit parameter, so the measurement values will be returned in inches.

URL: https://api.printful.com/products/561/sizes

Whole response body
Now, we'll take a closer look at the objects related to all three types of size tables.

Measure yourself size table

This object provides all measurements for the end customers to be able to measure themselves and see what size they should buy.

The corresponding response fragment
The measurement image with the descriptions for the product as seen in the web version of the size guides:

Image

The size chart from the web version:

Image

Product measurements size table

This object provides all product measurements so the end customer can measure a product they own and see what size they should buy.

The corresponding response fragment
The measurement image with the descriptions for the product as seen in the web version of the size guides:

Image

The size chart from the web version:

Image

International size conversion

This object provides information what international (US, EU, UK) sizes correspond to the product sizes.

The corresponding response fragment
The international size conversion table from the web version:

Image
Product containing Unlimited Color option

The following request will fetch Bella Canvas 3001 product (ID: 71).

Request URL: https://api.printful.com/products/71

Response data
Products API examples

Create a new Sync Product

Using multiple placements

Request body:

{
"sync_product": {
"name": "API product Bella",
"thumbnail": "https://example.com/image.jpg"
},
"sync_variants": [
{
"retail_price": "21.00",
"variant_id": 4011,
"files": [
{
"url": "https://example.com/image.jpg"
},
{
"type": "back",
"url": "https://example.com/image.jpg"
}
]
},
{
"retail_price": "21.00",
"variant_id": 4012,
"files": [
{
"url": "https://example.com/image.jpg"
},
{
"type": "back",
"url": "https://example.com/image.jpg"
}
]
}
]
}
Response data
Using inside label

Create a new Sync Product with native inside label.

Request body:

{
"sync_product": {
"name": "API product custom"
},
"sync_variants": [
{
"retail_price": "19.00",
"variant_id": 9575,
"files": [
{
"type": "front",
"url": "https://picsum.photos/200/300"
},
{
"type": "label_inside",
"url": "https://picsum.photos/200/300",
"options": [{
"id": "template_type",
"value": "native"
}]
}
],
"options": [
{
"id": "embroidery_type",
"value": "flat"
},
{
"id": "thread_colors",
"value": []
},
{
"id": "thread_colors_3d",
"value": []
},
{
"id": "thread_colors_chest_left",
"value": []
}
]
}
]
}
Response data
Modify a Sync Product

Update a Sync Product's Name and Thumbnail.

Request body:

{
"sync_product": {
"name": "API product new name",
"thumbnail": "https://example.com/image.jpg"
}
}
Response data
Update a Sync Product and one of its Sync Variants.

Request body:

{
"sync_product": {
"name": "API product new name",
"thumbnail": "https://example.com/image.jpg"
},
"sync_variants": [
{
"id": 866914574
},
{
"id": 866914580,
"retail_price": 21,
"files": [
{
"url": "https://example.com/image.jpg"
},
{
"type": "back",
"url": "https://example.com/image.jpg"
}
]
}
]
}
Response data
Modify a Sync Variant

Update price of an existing Sync Variant.

Request body:

{
"retail_price": "29.00"
}
Response data
Add a native inside label to an existing Sync Variant.

Request body:

{
"files": [
{
"type": "label_inside",
"url": "https://picsum.photos/200/300",
"options": [{
"id": "template_type",
"value": "native"
}]
}
]
}
Response data
Update the variant t-shirt to have only front print instead of both front and back prints.

Request body:

{
"files": [
{
"type": "default",
"url": "https://example.com/image.jpg"
}
]
}
Response data
Create a new Sync Variant

Request body:

{
"external_id": "my-external-id",
"retail_price": "19.00",
"variant_id": 4011,
"files": [
{
"type": "default",
"url": "https://example.com/image.jpg"
},
{
"type": "back",
"url": "https://example.com/image.jpg"
}
],
"options": [
{
"id": "embroidery_type",
"value": "flat"
},
{
"id": "thread_colors",
"value": []
},
{
"id": "thread_colors_3d",
"value": []
},
{
"id": "thread_colors_chest_left",
"value": []
}
]
}
Response data
Create a new Sync Variant with a native inside label.

Please note that the inside label type must be specified in the file options.

Request body:

{
"retail_price": "19.00",
"variant_id": 4025,
"files": [
{
"type": "default",
"url": "https://example.com/image.jpg"
},
{
"type": "label_inside",
"url": "https://example.com/image.jpg",
"options": [{
"id": "template_type",
"value": "native"
}]
}
],
"options": [
{
"id": "embroidery_type",
"value": "flat"
},
{
"id": "thread_colors",
"value": []
},
{
"id": "thread_colors_3d",
"value": []
},
{
"id": "thread_colors_chest_left",
"value": []
}
]
}
Response data
Filter products by single category ID

The IDs of the categories may be retrieved using the GET /categories endpoint. We're going to list products belonging to the "T-shirts" category (ID: 24).

Request URL: https://api.printful.com/store/products?category_id=24

Response data
Filter products by multiple category IDs

The following request will fetch T-shirts cases (ID: 24) and Dad hats (ID: 42).

Request URL: https://api.printful.com/store/products?category_id=24,42

Response data
Product Templates API

Get Template List

Response data
Get Template Details

Response data
Orders API examples

Using a catalog variant

Create an order containing an item, which shall be constructed on-the-fly and based on a print file and a variant_id from Printful Catalog.

Request body:

{
"recipient": {
"name": "John Doe",
"address1": "19749 Dearborn St",
"city": "Chatsworth",
"state_code": "CA",
"country_code": "US",
"zip": "91311"
},
"items": [
{
"variant_id": 1,
"quantity": 1,
"files": [
{
"url": "http://example.com/files/posters/poster_1.jpg"
}
]
}
]
}
Response data
Using a sync variant

Create an order containing an item, which is based on a pre-configured sync variant from the authorized Printful store and is referenced by its sync variant ID. Please note, that the existing sync variant must be configured (synced) for this to work.

Request body:

{
"recipient": {
"name": "John Doe",
"address1": "19749 Dearborn St",
"city": "Chatsworth",
"state_code": "CA",
"country_code": "US",
"zip": "91311"
},
"items": [
{
"sync_variant_id": 1,
"quantity": 1
}
]
}
Response data
Using sync variant with external ID

Create an order containing an item, which is based on a pre-configured sync variant from the authorized Printful store and is referenced by its external ID. Please note, that the existing Sync Variant must be configured (synced) for this to work.

Request body:

{
"recipient": {
"name": "John Doe",
"address1": "19749 Dearborn St",
"city": "Chatsworth",
"state_code": "CA",
"country_code": "US",
"zip": "91311"
},
"items": [
{
"external_variant_id": "5bc04fbe956148",
"quantity": 1
}
]
}
Response data
Using a product template

To create an order from a template, you need to know the IDs or External Product IDs of the product template(s) you want to use. You can find them by calling GET /product-templates or in the address bar when viewing the template in dashboard.

Specifying one variant from a product template ID

Request body:

{
"recipient": {
"name": "John Doe",
"address1": "19749 Dearborn St",
"city": "Chatsworth",
"state_code": "CA",
"country_code": "US",
"zip": "91311"
},
"items": [
{
"variant_id": 11325,
"quantity": 1,
"product_template_id": 123456789
}
]
}
Response data
Specifying multiple variants from a product template ID

Request body:

{
"recipient": {
"name": "John Doe",
"address1": "19749 Dearborn St",
"city": "Chatsworth",
"state_code": "CA",
"country_code": "US",
"zip": "91311"
},
"items": [
{
"variant_id": 6882,
"quantity": 1,
"product_template_id": 111222333
},
{
"variant_id": 1350,
"quantity": 2,
"product_template_id": 11235813
},
{
"variant_id": 4398,
"quantity": 1,
"product_template_id": 11235813
}
]
}
Response data
Using External Product ID

The Product Template may be specified by the associated External Product ID. You can mix it with Product Template IDs for different items but for one item, only one of the identifier fields must be present.

The External Product ID is used only to specify the template. The Item will be associated with the template and only its ID will be present in the response.

Request body:

{
"recipient": {
"name": "John Doe",
"address1": "19749 Dearborn St",
"city": "Chatsworth",
"state_code": "CA",
"country_code": "US",
"zip": "91311"
},
"items": [
{
"variant_id": 6882,
"quantity": 1,
"product_template_id": 111222333
},
{
"variant_id": 1350,
"quantity": 2,
"external_product_id": "fibonacci"
},
{
"variant_id": 4398,
"quantity": 1,
"external_product_id": "fibonacci"
}
]
}
Response data
Using customized retail prices

Create an order with external order ID, custom item names, and retail price information. Order with external ID and customized item names and prices.

Request body:

{
"external_id": "9887112",
"recipient": {
"name": "John Doe",
"address1": "19749 Dearborn St",
"city": "Chatsworth",
"state_code": "CA",
"country_code": "US",
"zip": "91311"
},
"items": [
{
"variant_id": 2,
"quantity": 1,
"name": "Niagara Falls poster",
"retail_price": "19.99",
"files": [
{
"url": "http://example.com/files/posters/poster_2.jpg"
}
]
},
{
"variant_id": 1,
"quantity": 3,
"name": "Grand Canyon poster",
"retail_price": "17.99",
"files": [
{
"url": "http://example.com/files/posters/poster_3.jpg"
}
]
}
],
"retail_costs": {
"shipping": "24.50"
}
}
Response data
Using multiple print placements

Create an order from a catalog variant that uses both front and back print files specified.

Request body:

{
"recipient": {
"name": "John Doe",
"address1": "19749 Dearborn St",
"city": "Chatsworth",
"state_code": "CA",
"country_code": "US",
"zip": "91311"
},
"items": [
{
"variant_id": 1118,
"quantity": 1,
"files": [
{
"type": "front",
"url": "http://example.com/files/tshirts/shirt_front.png"
},
{
"type": "back",
"url": "http://example.com/files/tshirts/shirt_back.png"
}
],
"options": []
}
]
}
Response data
Using all-over products

Create an order containing a pair of leggings with the "Stitch color" option specified.

Request body:

{
"recipient": {
"name": "John Doe",
"address1": "19749 Dearborn St",
"city": "Chatsworth",
"state_code": "CA",
"country_code": "US",
"zip": "91311"
},
"items": [{
"variant_id": 7983,
"quantity": 1,
"name": "Leggings",
"retail_price": "19.99",
"files": [{
"url": "https://example.com/id/858/2000/2009.jpg"
},
{
"url": "https://example.com/id/858/2000/2009.jpg",
"type": "label_inside"
}
],
"options": [{"id":"stitch_color", "value": "white"}]
}]
}
Response data
Using embroidery products

Create an order containing a hat with the embroidery type and thread colors specified.

Request body:

{
"recipient": {
"name": "John Doe",
"address1": "19749 Dearborn St",
"city": "Chatsworth",
"state_code": "CA",
"country_code": "US",
"zip": "91311"
},
"items": [
{
"variant_id": 8746,
"quantity": 1,
"files": [
{
"url": "http://example.com/files/hats/hats_mockup.jpg"
}
],
"options": [
{
"id": "embroidery_type",
"value": "flat"
},
{
"id": "thread_colors",
"value": ["#FFFFFF", "#A67843"]
}
]
}
]
}
Response data
Using full color option

Request body:

{
"recipient": {
"name": "John Doe",
"address1": "19749 Dearborn St",
"city": "Chatsworth",
"state_code": "CA",
"country_code": "US",
"zip": "91311"
},
"items": [
{
"variant_id": 8746,
"quantity": 1,
"files": [
{
"url": "http://example.com/files/hats/hats_mockup.jpg",
"type": "embroidery_front",
"options": [
{
"id": "full_color",
"value": true
}
]
}
]
}
]
}
Response data
T-shirt with an inside label

Create an order containing a t-shirt with a native inside label. Please note that the inside label type must be specified in the file options.

Request body:

{
"recipient": {
"name": "John Doe",
"address1": "19749 Dearborn St",
"city": "Chatsworth",
"state_code": "CA",
"country_code": "US",
"zip": "91311"
},
"items": [
{
"id": 16303890,
"variant_id": 6950,
"quantity": 1,
"files": [
{
"type": "front",
"url": "http://www.example.com/media/prints/38/large.jpg"
},
{
"type": "label_inside",
"url": "http://www.example.com/media/image_123.jpg",
"options": [
{
"id": "template_type",
"value": "native"
}
]
}
]
}
]
}
Response data
Embroidery patch

Create an order containing the embroidery patch.

Request body:

{
"recipient": {
"name": "John Doe",
"address1": "19749 Dearborn St",
"city": "Chatsworth",
"state_code": "CA",
"country_code": "US",
"zip": "91311"
},
"items": [
{
"variant_id": 12983,
"quantity": 1,
"files": [
{
"url": "https://pbs.twimg.com/profile_images/1073247505381552129/53OmqmtE_400x400.jpg",
"type": "embroidery_patch_front"
}
],
"options": [
{
"id": "thread_colors_outline",
"value": [
"#A67843"
]
},
{
"id": "thread_colors_patch_front",
"value": [
"#96A1A8",
"#3399FF",
"#E25C27",
"#CC3333",
"#333366",
"#000000"
]
}
]
}
]
}
Response data
Using Knitwear Product

In v1 of the API the color_reduction_mode is not available to be specified and it will always default to solid.

Create an order with an order for a knitwear product.

{
"recipient": {
"name": "john smith",
"company": "john smith inc",
"address1": "19749 dearborn st",
"city": "chatsworth",
"state_code": "ca",
"country_code": "us",
"country_name": "united states",
"zip": "91311"
},
"items": [
{
"variant_id": 19633,
"quantity": 1,
"files": [
{
"type": "front",
"url": "https://picsum.photos/200"
}
],
"options": [
{
"id": "yarn_colors",
"value": [
"#090909",
"#48542e"
]
},
{
"id": "trim_color",
"value": "#dcd3cc"
},
{
"id": "base_color",
"value": "#dda032"
}
]
}
]
}
Response data
The resulting mockup should look as follows:
Image
File Library API examples

Add a new file

Add file to the print file library, file name will be detected from URL. After creation file is not processed instantly.

Request body:

{
"url": "http://www.example.com/files/tshirts/example.png"
}
Response data:

{
"code": 200,
"result": {
"id": 11816,
"type": "default",
"hash": null,
"url": "http://www.example.com/files/tshirts/example.png",
"filename": null,
"mime_type": null,
"size": 0,
"width": null,
"height": null,
"dpi": null,
"status": "waiting",
"created": 1390819101,
"thumbnail_url": null,
"preview_url": null,
"visible": true
}
}
Add file to the mockup library, and specify file name manually

Request body:

{
"type": "preview",
"url": "http://www.example.com/files/tshirts/example.png",
"filename": "shirt1.png"
}
Add file to the library, but not show up in the web interface.

Request body:

{
"url": "http://www.example.com/files/tshirts/example.png",
"visible": 0
}
Suggest thread colors

Get suggested thread colors for provided image URL

Request body:

{
"file_url": "http://www.example.com/files/tshirts/example.png"
}
Response data:

{
"code": 200,
"result": {
"thread_colors": [
"#FFFFFF",
"#000000",
"#96A1A8",
"#CC3333",
"#E25C27"
]
},
}
Ecommerce Platform Sync API examples

Modify a Sync Variant

Links Sync Variant with T-shirt with front and back images.

Request body:

{
"variant_id": 1118,
"files": [
{
"url": "http://example.com/files/tshirts/shirt_front.png"
},
{
"type": "back",
"url": "http://example.com/files/tshirts/shirt_back.png"
}
],
"options": []
}
Response data
Mockup Generator API examples

Retrieve product variant print files with default technique

URI: GET /mockup-generator/printfiles/162

Response data
Retrieve product variant printfiles with specified technique

URI: GET /mockup-generator/printfiles/162?technique=EMBROIDERY

Response data
Get layout templates with default technique

URI: GET /mockup-generator/templates/162

Response data
Get layout templates with specified technique

URI: GET /mockup-generator/templates/162?technique=EMBROIDERY

Response data
