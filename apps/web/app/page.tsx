import { RoomView } from "@/components/room/RoomView";

export default function Home() {
  return (
    <main className="flex min-h-dvh flex-1 flex-col p-4 sm:p-6">
      <h1 className="sr-only">Pantrywood</h1>
      <RoomView />
    </main>
  );
}
