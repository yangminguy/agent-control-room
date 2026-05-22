import { ChatControlRoom } from "@/components/control-room/ChatControlRoom";
import { getLatestControlRoomPlan } from "@/lib/control-room/store";

export const dynamic = "force-dynamic";

export default async function Home() {
  const latestPlan = await getLatestControlRoomPlan();

  return (
    <ChatControlRoom
      initialPlan={latestPlan}
      openAiConfigured={Boolean(process.env.OPENAI_API_KEY)}
    />
  );
}
