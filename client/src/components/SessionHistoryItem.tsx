import { format } from "date-fns";
import { Trash2, MoreVertical } from "lucide-react";
import { motion } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Session {
  id: number;
  intervalFrequency: number;
  timer: number;
  createdAt: Date;
}

interface SessionHistoryItemProps {
  session: Session;
  index: number;
  onDelete: (id: number) => void;
}

export function SessionHistoryItem({ session, index, onDelete }: SessionHistoryItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="p-4 rounded-xl hover:bg-secondary/50 transition-colors border border-border/50 group"
    >
      <div className="flex justify-between items-center">
        <div className="flex-1">
          <div className="font-medium text-foreground flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary/40 group-hover:bg-primary transition-colors"></span>
            {session.timer} mins
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            {session.createdAt && format(new Date(session.createdAt), "MMMM d, yyyy 'at' h:mm a")}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1 hover:bg-secondary rounded-md transition-colors">
              <MoreVertical className="w-4 h-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="text-destructive focus:text-destructive cursor-pointer"
              onClick={() => onDelete(session.id)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
}
