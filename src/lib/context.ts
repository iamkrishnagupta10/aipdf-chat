import { Pinecone } from "@pinecone-database/pinecone";
import { convertToAscii } from "./utils";
import { getEmbeddings } from "./embeddings";

export async function getMatchesFromEmbeddings(
  embeddings: number[],
  fileKey: string
) {
  const pinecone = new Pinecone();
  const index = await pinecone.index("ai-pdf-chat");

  try {
    const namespace = convertToAscii(fileKey);
    const queryResult = await index.query({
      vector: embeddings,
      topK: 5,
      includeMetadata: true,
    })
    return queryResult.matches || [];
  } catch (error) {
    console.log("error querying embeddings", error);
    throw error;
  }
}

export async function getContext(query: string, fileKey: string) {
  const queryEmbeddings = await getEmbeddings(query);
  const matches = await getMatchesFromEmbeddings(queryEmbeddings, fileKey);

  const qualifyingDocs = matches.filter(
    (match: any) => match.score && match.score > 0.7
  );

  type Metadata = {
    text: string;
    pageNumber: number;
  };

  let docs = qualifyingDocs.map((match: any) => (match.metadata as Metadata).text);
  // Limit to 5 vectors
  return docs.join("\n").substring(0, 3000);
}
