import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Trophy, Medal, Crown, Users, Search, UserPlus, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  total_distance_km: number;
  total_calories: number;
  total_activities: number;
}

interface FriendRequest {
  id: string;
  user_id: string;
  friend_id: string;
  status: string;
  profile?: Profile;
}

export function SocialLeaderboard() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [friends, setFriends] = useState<FriendRequest[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }

      // Fetch all profiles for leaderboard
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("*")
        .order("total_distance_km", { ascending: false });

      if (profilesData) {
        setProfiles(profilesData as Profile[]);
      }

      // Fetch friends
      if (user) {
        const { data: friendsData } = await supabase
          .from("friends")
          .select("*")
          .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
          .eq("status", "accepted");

        if (friendsData) {
          setFriends(friendsData as FriendRequest[]);
        }

        // Fetch pending requests
        const { data: pendingData } = await supabase
          .from("friends")
          .select("*")
          .eq("friend_id", user.id)
          .eq("status", "pending");

        if (pendingData) {
          setPendingRequests(pendingData as FriendRequest[]);
        }
      }
    } catch (error) {
      console.error("Error fetching social data:", error);
    }
    setIsLoading(false);
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from("friends")
        .update({ status: "accepted" })
        .eq("id", requestId);

      if (error) throw error;

      toast.success("Friend request accepted!");
      fetchData();
    } catch (error) {
      toast.error("Failed to accept request");
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from("friends")
        .delete()
        .eq("id", requestId);

      if (error) throw error;

      toast.success("Request declined");
      fetchData();
    } catch (error) {
      toast.error("Failed to decline request");
    }
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Crown className="w-5 h-5 text-yellow-500" />;
      case 1:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 2:
        return <Medal className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="w-5 text-center font-bold text-muted-foreground">{index + 1}</span>;
    }
  };

  const filteredProfiles = profiles.filter(
    (p) =>
      p.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      searchQuery === ""
  );

  return (
    <div className="space-y-6">
      {/* Pending Friend Requests */}
      {pendingRequests.length > 0 && (
        <Card className="glass border-primary/30 hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              Friend Requests ({pendingRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingRequests.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between p-3 rounded-xl bg-secondary/30"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback>U</AvatarFallback>
                  </Avatar>
                  <span className="font-medium">New Friend Request</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => handleAcceptRequest(request.id)}
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRejectRequest(request.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Leaderboard */}
      <Card className="glass hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="w-5 h-5 text-warning" />
              Leaderboard
            </CardTitle>
            <span className="text-sm text-muted-foreground">
              {profiles.length} athletes
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search athletes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Top 3 Podium */}
          {searchQuery === "" && profiles.length >= 3 && (
            <div className="flex items-end justify-center gap-2 py-4">
              {/* 2nd Place */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-center"
              >
                <Avatar className="w-14 h-14 mx-auto border-2 border-gray-400">
                  <AvatarFallback className="bg-gray-400/20">
                    {profiles[1]?.display_name?.[0] || "2"}
                  </AvatarFallback>
                </Avatar>
                <div className="mt-2 h-16 w-16 bg-gray-400/20 rounded-t-lg flex items-center justify-center">
                  <Medal className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-xs font-medium mt-1 truncate w-16">
                  {profiles[1]?.display_name || "User"}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {profiles[1]?.total_distance_km?.toFixed(1) || 0} km
                </p>
              </motion.div>

              {/* 1st Place */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
              >
                <Avatar className="w-16 h-16 mx-auto border-2 border-yellow-500">
                  <AvatarFallback className="bg-yellow-500/20">
                    {profiles[0]?.display_name?.[0] || "1"}
                  </AvatarFallback>
                </Avatar>
                <div className="mt-2 h-24 w-20 bg-yellow-500/20 rounded-t-lg flex items-center justify-center">
                  <Crown className="w-8 h-8 text-yellow-500" />
                </div>
                <p className="text-sm font-bold mt-1 truncate w-20">
                  {profiles[0]?.display_name || "User"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {profiles[0]?.total_distance_km?.toFixed(1) || 0} km
                </p>
              </motion.div>

              {/* 3rd Place */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-center"
              >
                <Avatar className="w-12 h-12 mx-auto border-2 border-amber-600">
                  <AvatarFallback className="bg-amber-600/20">
                    {profiles[2]?.display_name?.[0] || "3"}
                  </AvatarFallback>
                </Avatar>
                <div className="mt-2 h-12 w-14 bg-amber-600/20 rounded-t-lg flex items-center justify-center">
                  <Medal className="w-5 h-5 text-amber-600" />
                </div>
                <p className="text-xs font-medium mt-1 truncate w-14">
                  {profiles[2]?.display_name || "User"}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {profiles[2]?.total_distance_km?.toFixed(1) || 0} km
                </p>
              </motion.div>
            </div>
          )}

          {/* Full List */}
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {filteredProfiles.slice(searchQuery ? 0 : 3).map((profile, index) => {
              const actualIndex = searchQuery ? index : index + 3;
              const isCurrentUser = profile.user_id === currentUserId;

              return (
                <motion.div
                  key={profile.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className={`flex items-center gap-3 p-3 rounded-xl ${
                    isCurrentUser ? "bg-primary/10 border border-primary/30" : "bg-secondary/30"
                  }`}
                >
                  <div className="w-6 flex justify-center">
                    {getRankIcon(actualIndex)}
                  </div>
                  <Avatar className="w-10 h-10">
                    <AvatarFallback>
                      {profile.display_name?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {profile.display_name || "Anonymous"}
                      {isCurrentUser && (
                        <span className="text-xs text-primary ml-2">(You)</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {profile.total_activities || 0} activities
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{(profile.total_distance_km || 0).toFixed(1)} km</p>
                    <p className="text-xs text-muted-foreground">
                      {(profile.total_calories || 0).toLocaleString()} cal
                    </p>
                  </div>
                </motion.div>
              );
            })}

            {filteredProfiles.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>No athletes found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
