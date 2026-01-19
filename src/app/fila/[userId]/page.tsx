import PublicQueueClient from "./client";

export default async function PublicQueuePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  return <PublicQueueClient userId={userId} />;
}
