import { Pinecone, Vector } from "@pinecone-database/pinecone";
import { Document, RecursiveCharacterTextSplitter } from "@pinecone-database/doc-splitter";
import { downloadFromS3 } from "./s3-server";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import { getEmbeddings } from "./embeddings";
import md5 from "md5";
import { convertToAscii } from "./utils";

let pinecone: Pinecone | null = null;

// Initialize Pinecone client
export const getPineconeClient = () => {
  if (!pinecone) {
    pinecone = new Pinecone(); // Updated initialization
  }
  return pinecone;
}

type PDFPage = {
  pageContent: string;
  metadata: {
    loc: { pageNumber: number };
  };
};

// Load S3 data into Pinecone
export async function loadS3IntoPinecone(filekey: string) {
    // STEPS : 1. Obtain the PDF
    console.log('downloading s3 into file system');
    const file_name = await downloadFromS3(filekey);
    if (!file_name) {
        throw new Error("could not download from s3");
    }
    const loader = new PDFLoader(file_name);
    const pages = (await loader.load()) as PDFPage[];
    
    // 2. split and segment the pdf
    const documents = await Promise.all(pages.map(prepareDocument));
    
    // 3. vectorise and embed individual documents
    const vectors = await Promise.all(documents.flat().map(embedDocument));
    
    // 4. upload to pinecone
    const client = await getPineconeClient();
    const pineconeIndex = client.index("ai-pdf-chat"); // Updated method call
    
    console.log('inserting vectors into pinecone');
    const namespace = convertToAscii(filekey);
    pineconeIndex.namespace(namespace).upsert(vectors as any[]);
    // Updated method call

  return documents[0];
}

// Embed the document
async function embedDocument(doc: Document) {
  try {
    const embeddings = await getEmbeddings(doc.pageContent);
    const hash = md5(doc.pageContent);

    return {
      id: hash,
      values: embeddings,
      metadata: {
        text: doc.metadata.text,
        pageNumber: doc.metadata.pageNumber,
      },
    } as Vector;
  } catch (error) {
    console.log("error embedding document", error);
    throw error;
  }
}

// Truncate string by bytes
export const truncateStringByBytes = (str: string, bytes: number) => {
  const enc = new TextEncoder();
  return new TextDecoder("utf-8").decode(enc.encode(str).slice(0, bytes));
};

// Prepare the document
async function prepareDocument(page: PDFPage) {
  let { pageContent, metadata } = page;
  pageContent = pageContent.replace(/\n/g, "");
  // split the docs
  const splitter = new RecursiveCharacterTextSplitter();
  const docs = await splitter.splitDocuments([
    new Document({
      pageContent,
      metadata: {
        pageNumber: metadata.loc.pageNumber,
        text: truncateStringByBytes(pageContent, 36000),
      },
    }),
  ]);
  return docs;
}
