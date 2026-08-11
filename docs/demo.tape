Output docs/demo.gif
Require node
Require zsh

Set Shell "zsh"
Set FontSize 16
Set Width 1280
Set Height 720
Set Framerate 16
Set PlaybackSpeed 1.50
Set TypingSpeed 50ms
Set Theme "tokyonight-storm"

Hide
Type "[[ -r /usr/share/zsh/plugins/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh ]] && source /usr/share/zsh/plugins/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh"
Enter
Sleep 100ms
Type "DEMO_DIR=$(mktemp -d)"
Enter
Sleep 600ms
Type 'LINEAR_AXI="$PWD/bin/linear-axi.js"'
Enter
Sleep 600ms
Type 'git -C "$DEMO_DIR" init -q'
Enter
Sleep 600ms
Type 'cd "$DEMO_DIR"'
Enter
Sleep 600ms
Type "STAMP=$(date +%H%M%S)"
Enter
Sleep 600ms
Type 'PROJECT="AXI Demo $STAMP"'
Enter
Sleep 600ms
Type 'ISSUE_TITLE="Demo: wire the agent handoff $STAMP"'
Enter
Sleep 1400ms
Ctrl+L
Sleep 1000ms
Show

Type '"$LINEAR_AXI"'
Enter
Sleep 3s
Ctrl+L
Sleep 500ms

Type '"$LINEAR_AXI" teams list --fields key,name --limit 5'
Enter
Sleep 3s
Hide
Type "TEAM=$(\"$LINEAR_AXI\" teams list --fields key --limit 1 | awk '/^  / { print $1; exit }')"
Enter
Sleep 100ms
Ctrl+L
Sleep 200ms
Show

Type '"$LINEAR_AXI" projects list --query "$PROJECT" --fields id,name,status --limit 5'
Enter
Sleep 3s
Ctrl+L
Sleep 500ms

Type '"$LINEAR_AXI" projects create --name "$PROJECT" --team "$TEAM" --summary "Short-lived demo project for the CLI walkthrough" | tee project.out'
Enter
Sleep 3s
Ctrl+L
Sleep 500ms

Hide
Type "PROJECT_ID=$(awk '/  id: / { print $2; exit }' project.out)"
Enter
Sleep 60ms
Type "PROJECT_CLEANED="
Enter
Sleep 60ms
Type 'cleanup_project() { [[ -n "$PROJECT_ID" && -z "$PROJECT_CLEANED" ]] && "$LINEAR_AXI" projects update --id "$PROJECT_ID" --state canceled >/dev/null; }'
Enter
Sleep 60ms
Type "trap cleanup_project EXIT"
Enter
Sleep 60ms
Ctrl+L
Sleep 500ms
Show
Type '"$LINEAR_AXI" init --project "$PROJECT"'
Enter
Sleep 1s
Ctrl+L
Sleep 500ms

Type '"$LINEAR_AXI"'
Enter
Sleep 4.5s
Ctrl+L
Sleep 500ms

Type '"$LINEAR_AXI" issues create --title "$ISSUE_TITLE" --team "$TEAM" --assignee me --priority 2 | tee issue.out'
Enter
Sleep 3s
Ctrl+L
Sleep 500ms

Hide
Type "ISSUE_ID=$(awk '/  id: / { print $2; exit }' issue.out)"
Enter
Sleep 60ms
Ctrl+L
Sleep 500ms
Show
Type '"$LINEAR_AXI" issues list --assignee me --project "$PROJECT" --fields id,title,state,priority --limit 5'
Enter
Sleep 3s
Ctrl+L
Sleep 500ms

Type '"$LINEAR_AXI" issues view "$ISSUE_ID"'
Enter
Sleep 3s
Ctrl+L
Sleep 500ms

Type '"$LINEAR_AXI" comments create --issue "$ISSUE_ID" --body "Starting this now; demo captured the project setup and issue lookup."'
Enter
Sleep 3s
Ctrl+L
Sleep 500ms

Type '"$LINEAR_AXI" comments list --issue "$ISSUE_ID"'
Enter
Sleep 3s
Ctrl+L
Sleep 500ms

Type '"$LINEAR_AXI" issues view all'
Enter
Sleep 3s
Ctrl+L
Sleep 500ms

Type '"$LINEAR_AXI" projects update --id "$PROJECT_ID" --state canceled'
Enter
Sleep 3s
Hide
Type "PROJECT_CLEANED=1"
Enter
Sleep 60ms
